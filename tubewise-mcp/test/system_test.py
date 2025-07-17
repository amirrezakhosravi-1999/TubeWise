import os
import sys
import subprocess
import time
import requests
import webbrowser
import platform
import signal
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

class TubeWiseSystemTest:
    def __init__(self):
        self.project_root = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.services_dir = self.project_root / "services"
        self.web_client_dir = self.project_root / "web-client"
        self.ai_service_dir = self.services_dir / "ai-service"
        self.processes = []
        
    def print_header(self, text):
        print(f"\n{Colors.HEADER}{Colors.BOLD}=== {text} ==={Colors.ENDC}\n")
        
    def print_step(self, text):
        print(f"{Colors.BLUE}➤ {text}{Colors.ENDC}")
        
    def print_success(self, text):
        print(f"{Colors.GREEN}✓ {text}{Colors.ENDC}")
        
    def print_warning(self, text):
        print(f"{Colors.YELLOW}⚠ {text}{Colors.ENDC}")
        
    def print_error(self, text):
        print(f"{Colors.RED}✗ {text}{Colors.ENDC}")
    
    def check_environment(self):
        """Check if all required environment variables are set."""
        self.print_header("Checking Environment")
        
        # Load environment variables from .env file
        env_file = self.project_root / ".env"
        if not env_file.exists():
            self.print_error("Missing .env file in project root")
            return False
            
        self.print_success("Found .env file")
        
        # Check for required environment variables
        required_vars = [
            "YOUTUBE_API_KEY",
            "OPENAI_API_KEY",
            "POSTGRES_USER",
            "POSTGRES_PASSWORD",
            "POSTGRES_DB"
        ]
        
        missing_vars = []
        with open(env_file, 'r') as f:
            env_content = f.read()
            for var in required_vars:
                if var not in env_content:
                    missing_vars.append(var)
        
        if missing_vars:
            self.print_error(f"Missing environment variables: {', '.join(missing_vars)}")
            return False
            
        self.print_success("All required environment variables are set")
        return True
    
    def check_dependencies(self):
        """Check if all required dependencies are installed."""
        self.print_header("Checking Dependencies")
        
        # Check Python version
        python_version = sys.version.split()[0]
        self.print_step(f"Python version: {python_version}")
        if int(python_version.split('.')[0]) < 3 or int(python_version.split('.')[1]) < 9:
            self.print_error("Python 3.9 or higher is required")
            return False
        
        # Check Node.js version
        try:
            node_version = subprocess.check_output(["node", "--version"]).decode().strip()
            self.print_step(f"Node.js version: {node_version}")
            if int(node_version.split('.')[0].replace('v', '')) < 16:
                self.print_warning("Node.js 16 or higher is recommended")
        except (subprocess.SubprocessError, FileNotFoundError):
            self.print_error("Node.js is not installed or not in PATH")
            return False
        
        # Check Docker
        try:
            docker_version = subprocess.check_output(["docker", "--version"]).decode().strip()
            self.print_step(f"Docker: {docker_version}")
        except (subprocess.SubprocessError, FileNotFoundError):
            self.print_warning("Docker is not installed or not in PATH (required for production deployment)")
        
        # Check Python dependencies
        requirements_file = self.ai_service_dir / "requirements.txt"
        if not requirements_file.exists():
            self.print_error("Missing requirements.txt file in AI service directory")
            return False
            
        self.print_success("Found requirements.txt file")
        
        # Check Node.js dependencies
        package_json = self.web_client_dir / "package.json"
        if not package_json.exists():
            self.print_error("Missing package.json file in web client directory")
            return False
            
        self.print_success("Found package.json file")
        
        return True
    
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
        time.sleep(5)
        
        # Check if AI service is running
        try:
            response = requests.get("http://localhost:8000/health")
            if response.status_code == 200:
                self.print_success("AI service is running and responding")
            else:
                self.print_error(f"AI service returned status code {response.status_code}")
                return False
        except requests.RequestException:
            self.print_error("AI service is not responding")
            return False
        
        # Start web client
        self.print_step("Starting web client...")
        web_client_cmd = ["npm", "run", "dev"]
        
        try:
            web_client_process = subprocess.Popen(
                web_client_cmd, 
                cwd=self.web_client_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            self.processes.append(web_client_process)
            self.print_success("Web client started")
        except Exception as e:
            self.print_error(f"Failed to start web client: {e}")
            return False
        
        # Wait for web client to start
        time.sleep(10)
        
        # Check if web client is running
        try:
            response = requests.get("http://localhost:3000")
            if response.status_code == 200:
                self.print_success("Web client is running and responding")
            else:
                self.print_error(f"Web client returned status code {response.status_code}")
                return False
        except requests.RequestException:
            self.print_error("Web client is not responding")
            return False
        
        return True
    
    def run_api_tests(self):
        """Run API tests."""
        self.print_header("Running API Tests")
        
        # Import the API test module
        sys.path.append(str(self.project_root / "test"))
        try:
            import api_test
            result = api_test.run_all_tests()
            if result:
                self.print_success("All API tests passed")
            else:
                self.print_error("Some API tests failed")
            return result
        except ImportError as e:
            self.print_error(f"Failed to import API test module: {e}")
            return False
    
    def open_web_client(self):
        """Open web client in browser for manual testing."""
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
    
    def run_all_tests(self):
        """Run all system tests."""
        try:
            if not self.check_environment():
                return False
            
            if not self.check_dependencies():
                return False
            
            if not self.start_services():
                return False
            
            if not self.run_api_tests():
                return False
            
            if not self.open_web_client():
                return False
            
            input("\nPress Enter to stop the services and end the test...")
            
            return True
        except KeyboardInterrupt:
            self.print_warning("Test interrupted by user")
            return False
        finally:
            self.cleanup()

if __name__ == "__main__":
    tester = TubeWiseSystemTest()
    success = tester.run_all_tests()
    
    if success:
        print(f"\n{Colors.GREEN}{Colors.BOLD}All system tests completed successfully!{Colors.ENDC}")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}System tests failed!{Colors.ENDC}")
        
    sys.exit(0 if success else 1)
