import io
import sys
import platform
import resource
import multiprocessing
from typing import List, Dict, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# FastAPI App
app = FastAPI(title="Secure Python Execution Visualizer API")

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://codevisualiser.com"],  # live site origin
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["*"],
)


# Pydantic Models
class CodeRequest(BaseModel):
    code: str
    step: Optional[int] = None  # optional specific step


class ExecutionStep(BaseModel):
    line: int
    code: str
    variables: Dict[str, str]
    output: Optional[str] = None


class CodeResponse(BaseModel):
    steps: List[ExecutionStep]
    error: Optional[str] = None


# Code Execution Utilities
def run_in_process(code: str, conn: multiprocessing.Pipe) -> None:
    steps: List[ExecutionStep] = []
    output_buffer = io.StringIO()
    error_msg: Optional[str] = None
    code_lines = code.splitlines()
    last_output_pos = 0

    # Limit memory (Unix only)
    if platform.system() != "Windows":
        try:
            resource.setrlimit(resource.RLIMIT_AS, (50 * 1024 * 1024, 50 * 1024 * 1024))  # 150 MB
        except Exception:
            pass

    # Safe built-ins
    safe_builtins = {
        # Basic types & constructors
        "int": int,
        "float": float,
        "str": str,
        "bool": bool,
        "list": list,
        "dict": dict,
        "set": set,
        "tuple": tuple,
        "frozenset": frozenset,
        "complex": complex,
        "len": len,
        "abs": abs,

        # Math & numeric helpers
        "min": min,
        "max": max,
        "sum": sum,
        "round": round,
        "pow": pow,

        # Iteration tools
        "range": range,
        "enumerate": enumerate,
        "zip": zip,
        "map": map,
        "filter": filter,
        "reversed": reversed,
        "sorted": sorted,
        "any": any,
        "all": all,
        "iter": iter,
        "next": next,

        # Type & object helpers
        "isinstance": isinstance,
        "issubclass": issubclass,
        "type": type,
        "id": id,
        "callable": callable,
        "super": super,

        # Safe conversions
        "chr": chr,
        "ord": ord,
        "bin": bin,
        "hex": hex,
        "oct": oct,

        # Printing (buffered for stacking new outputs)
        "print": lambda *args: print(*args, file=output_buffer),

        # Required for classes
        "__build_class__": __build_class__,
        "__name__": __name__,

        # Safe exceptions (optional, for raising/catching)
        "Exception": Exception,
        "ValueError": ValueError,
        "TypeError": TypeError,
        "IndexError": IndexError,
        "KeyError": KeyError,
    }

    # Tracer function
    def tracer(frame, event, arg):
        nonlocal last_output_pos
        if frame.f_code.co_filename != "<string>":
            return tracer
        if event == "line":
            lineno = frame.f_lineno
            line_text = code_lines[lineno - 1] if 0 <= lineno - 1 < len(code_lines) else ""
            # Filter out dunder variables & internals
            local_vars = {
                k: repr(v)[:200]
                for k, v in frame.f_locals.items()
                if not (k.startswith("__") and k.endswith("__"))
                   and k not in ("output_buffer", "__builtins__")
            }
            current_value = output_buffer.getvalue()
            new_output = current_value[last_output_pos:]
            last_output_pos = len(current_value)
            steps.append(ExecutionStep(
                line=lineno,
                code=line_text,
                variables=local_vars,
                output=new_output if new_output else None
            ))
        elif event in ("return", "exception"):
            current_value = output_buffer.getvalue()
            new_output = current_value[last_output_pos:]
            last_output_pos = len(current_value)
            if steps:
                steps[-1].output = (steps[-1].output or "") + (new_output or "")

        return tracer

    try:
        safe_globals = {"__builtins__": safe_builtins}
        safe_locals = safe_globals
        sys.settrace(tracer)
        exec(code, safe_globals, safe_locals)
        sys.settrace(None)
    except Exception as e:
        sys.settrace(None)
        if steps:
            steps[-1].output = (steps[-1].output or "") + f"\nError: {type(e).__name__} - {str(e)}"
        else:
            error_msg = f"{type(e).__name__} - {str(e)}"

    conn.send((steps, error_msg))
    conn.close()


def run_code(code: str, step: Optional[int] = None) -> CodeResponse:
    parent_conn, child_conn = multiprocessing.Pipe()
    process = multiprocessing.Process(target=run_in_process, args=(code, child_conn))
    process.start()
    process.join(timeout=2)

    if process.is_alive():
        process.terminate()
        return CodeResponse(steps=[], error="Execution timed out")

    try:
        steps, error_msg = parent_conn.recv()
    except EOFError:
        return CodeResponse(steps=[], error="Execution failed unexpectedly")

    # If a specific step is requested, return only that step
    if step is not None:
        if 0 <= step < len(steps):
            steps = [steps[step]]
        else:
            return CodeResponse(steps=[], error=f"Step {step} out of range")

    return CodeResponse(steps=steps, error=error_msg)


# API Endpoint
@app.post("/run", response_model=CodeResponse)
async def execute_code(request: CodeRequest) -> CodeResponse:
    return run_code(request.code, request.step)
