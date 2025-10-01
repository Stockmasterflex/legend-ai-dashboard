import sys
from pathlib import Path


def fail(msg: str) -> None:
    print(f"[doctor_dockerfile] {msg}")
    sys.exit(1)


def main() -> None:
    dockerfile = Path("Dockerfile")
    if not dockerfile.exists():
        fail("Dockerfile not found at repo root")

    content = dockerfile.read_text().splitlines()

    # Assert no EXPOSE 8000 exact
    for line in content:
        if line.strip().upper() == "EXPOSE 8000":
            fail("Dockerfile must not EXPOSE 8000; remove or use EXPOSE 10000")

    # Assert CMD includes --port $PORT
    cmd_lines = [l for l in content if l.strip().startswith("CMD") or l.strip().startswith("ENTRYPOINT")]
    if not any("--port $PORT" in l for l in cmd_lines):
        fail("CMD/ENTRYPOINT must include '--port $PORT'")

    # If healthcheck exists, ensure correct curl
    health = [l for l in content if l.strip().upper().startswith("HEALTHCHECK")]
    if health:
        joined = "\n".join(health)
        if "http://localhost:${PORT}/healthz" not in joined:
            fail("HEALTHCHECK must curl 'http://localhost:${PORT}/healthz'")

    print("[doctor_dockerfile] OK")


if __name__ == "__main__":
    main()


