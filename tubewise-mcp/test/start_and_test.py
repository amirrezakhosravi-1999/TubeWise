import os
import sys
import subprocess
import time
import webbrowser
import signal
import platform
import shutil
from pathlib import Path

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

class TubeWiseStarter:
    def __init__(self):
        self.project_root = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.services_dir = self.project_root / "services"
        self.web_client_dir = self.project_root / "web-client"
        self.ai_service_dir = self.services_dir / "ai-service"
        self.processes = []
        
        # Find npm and node executables
        self.npm_path = shutil.which('npm')
        self.node_path = shutil.which('node')
        
        if not self.npm_path:
            print(f"{Colors.RED}ERROR: npm not found in PATH{Colors.ENDC}")
        else:
            print(f"Using npm from: {self.npm_path}")
            
        if not self.node_path:
            print(f"{Colors.RED}ERROR: node not found in PATH{Colors.ENDC}")
        else:
            print(f"Using node from: {self.node_path}")
        
    def print_header(self, text):
        print(f"\n{Colors.HEADER}{Colors.BOLD}=== {text} ==={Colors.ENDC}\n")
        
    def print_step(self, text):
        print(f"{Colors.BLUE}> {text}{Colors.ENDC}")
        
    def print_success(self, text):
        print(f"{Colors.GREEN}+ {text}{Colors.ENDC}")
        
    def print_warning(self, text):
        print(f"{Colors.YELLOW}! {text}{Colors.ENDC}")
        
    def print_error(self, text):
        print(f"{Colors.RED}- {text}{Colors.ENDC}")
    
    def start_services(self):
        """Start all required services."""
        self.print_header("Starting Services")
        
        # Start AI service
        self.print_step("Starting AI service...")
        ai_service_cmd = ["python", "simple_app.py"]
        
        try:
            ai_service_process = subprocess.Popen(
                ai_service_cmd, 
                cwd=self.ai_service_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            self.processes.append(ai_service_process)
            self.print_success("AI service started")
        except Exception as e:
            self.print_error(f"Failed to start AI service: {e}")
            return False
        
        # Wait for AI service to start
        self.print_step("Waiting for AI service to initialize...")
        time.sleep(5)
        
        # Start web client
        self.print_step("Starting web client...")
        
        if not self.npm_path:
            self.print_error("Cannot start web client: npm not found")
            return False
            
        web_client_cmd = [self.npm_path, "run", "dev"]
        
        try:
            web_client_process = subprocess.Popen(
                web_client_cmd, 
                cwd=self.web_client_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=os.environ.copy()  # Use current environment variables
            )
            self.processes.append(web_client_process)
            self.print_success("Web client started")
        except Exception as e:
            self.print_error(f"Failed to start web client: {e}")
            return False
        
        # Wait for web client to start
        self.print_step("Waiting for web client to initialize...")
        time.sleep(10)
        
        self.print_success("All services started successfully")
        return True
    
    def open_web_client(self):
        """Open web client in browser."""
        self.print_header("Opening Web Client")
        
        self.print_step("Opening web client in browser...")
        webbrowser.open("http://localhost:3000")
        
        self.print_step("Please test the following features manually:")
        print("1. Enter a YouTube URL and get a summary")
        print("2. Try the chat feature with a video")
        print("3. Test content generation")
        print("4. Test multi-video comparison")
        print("5. Check if the UI is responsive on different screen sizes")
        
        return True
    
    def cleanup(self):
        """Clean up all started processes."""
        self.print_header("Cleaning Up")
        
        for process in self.processes:
            self.print_step(f"Terminating process with PID {process.pid}...")
            if platform.system() == "Windows":
                process.terminate()
            else:
                os.kill(process.pid, signal.SIGTERM)
        
        self.print_success("All processes terminated")
    
    def run(self):
        """Start the application and open it for testing."""
        try:
            if not self.start_services():
                return False
            
            if not self.open_web_client():
                return False
            
            self.print_header("Testing Instructions")
            print("1. Use the web application to test its functionality")
            print("2. Open browser console and paste the contents of frontend_test.js to run automated tests")
            print("3. Check the test results in the console")
            
            input("\nPress Enter to stop the services and end the test...")
            
            return True
        except KeyboardInterrupt:
            self.print_warning("Test interrupted by user")
            return False
        finally:
            self.cleanup()

if __name__ == "__main__":
    starter = TubeWiseStarter()
    success = starter.run()
    
    if success:
        print(f"\n{Colors.GREEN}{Colors.BOLD}Application started and tested successfully!{Colors.ENDC}")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}Failed to start or test the application!{Colors.ENDC}")
        
    sys.exit(0 if success else 1)
