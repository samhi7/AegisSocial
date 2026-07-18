import subprocess
import os
import sys
import time

def run():
    print("=" * 60)
    print("Starting AI-Powered Social Media & Moderation Platform...")
    print("=" * 60)

    # Resolve paths
    root_dir = os.path.abspath(os.path.dirname(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    # 1. Verify baseline model is trained
    model_path = os.path.join(backend_dir, "app", "models", "logistic_regression.pkl")
    if not os.path.exists(model_path):
        print("\n--> Lr Baseline model not found. Training it now...")
        train_script = os.path.join(backend_dir, "app", "train_baseline.py")
        subprocess.run([sys.executable, train_script], cwd=backend_dir, check=True)
        print("--> Lr Baseline model trained successfully.\n")

    # 2. Start Backend Server
    print("--> Launching FastAPI Backend Server on http://127.0.0.1:8000...")
    backend_process = subprocess.Popen(
        [sys.executable, "run.py"],
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # 3. Start Frontend Server
    print("--> Launching Vite Frontend Dev Server on http://localhost:5173...")
    frontend_process = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Small delay for startups
    time.sleep(2)

    # Check if processes started successfully
    if backend_process.poll() is not None:
        print("ERROR: Backend failed to start immediately. Exit code:", backend_process.poll())
        sys.exit(1)
    if frontend_process.poll() is not None:
        print("ERROR: Frontend failed to start immediately. Exit code:", frontend_process.poll())
        backend_process.terminate()
        sys.exit(1)

    print("\n" + "=" * 60)
    print("AegisSocial is running! Open your browser at:")
    print("    Frontend: http://localhost:5173")
    print("    Backend:  http://127.0.0.1:8000")
    print("Press Ctrl+C to terminate both servers.")
    print("=" * 60 + "\n")

    # Monitor outputs and forward logs
    try:
        # Set processes to non-blocking read
        os.set_blocking(backend_process.stdout.fileno(), False)
        os.set_blocking(frontend_process.stdout.fileno(), False)
        
        while True:
            # Check if terminated
            if backend_process.poll() is not None:
                print("\n[Backend Terminated]")
                break
            if frontend_process.poll() is not None:
                print("\n[Frontend Terminated]")
                break

            # Print backend logs
            try:
                line = backend_process.stdout.readline()
                if line:
                    print(f"[Backend] {line.strip()}")
            except IOError:
                pass

            # Print frontend logs
            try:
                line = frontend_process.stdout.readline()
                if line:
                    print(f"[Frontend] {line.strip()}")
            except IOError:
                pass

            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\n--> Stopping servers gracefully...")
    finally:
        # Graceful cleanup
        backend_process.terminate()
        frontend_process.terminate()
        print("--> Servers shut down successfully. Goodbye!")

if __name__ == "__main__":
    run()
