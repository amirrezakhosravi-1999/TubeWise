import sys
import os
import subprocess
import time
import webbrowser

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_test(test_script, description):
    """Run a test script and print the result."""
    print(f"\n=== Running {description} ===")
    try:
        result = subprocess.run(
            ["python", test_script],
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print(f"[PASS] {description} completed successfully")
            print(f"Output: {result.stdout[:500]}...")  # Print first 500 chars of output
        else:
            print(f"[FAIL] {description} failed with exit code {result.returncode}")
            print(f"Error: {result.stderr}")
        
        return result.returncode == 0
    except Exception as e:
        print(f"[FAIL] {description} failed with exception: {e}")
        return False

def open_frontend_test():
    """Open the frontend test in a browser."""
    print("\n=== Opening Frontend Test in Browser ===")
    try:
        test_html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "key_points_frontend_test.html")
        webbrowser.open(f"file://{test_html_path}")
        print("[PASS] Frontend test opened in browser")
        return True
    except Exception as e:
        print(f"[FAIL] Failed to open frontend test: {e}")
        return False

if __name__ == "__main__":
    print("=== TubeWise Key Points Comprehensive Testing ===")
    
    # List of tests to run
    tests = [
        ("test/key_points_test.py", "Key Points Extraction Test"),
        ("test/debug_key_points.py", "Key Points Debugging Test"),
        ("test/key_points_comprehensive_test.py", "Key Points Comprehensive Test")
    ]
    
    # Run all tests
    results = []
    for test_script, description in tests:
        success = run_test(test_script, description)
        results.append((description, success))
    
    # Open frontend test
    frontend_success = open_frontend_test()
    results.append(("Frontend Test", frontend_success))
    
    # Print summary
    print("\n=== Test Summary ===")
    all_passed = True
    for description, success in results:
        status = "[PASS]" if success else "[FAIL]"
        print(f"{status} - {description}")
        if not success:
            all_passed = False
    
    print("\n=== Overall Result ===")
    if all_passed:
        print("[PASS] All tests passed successfully!")
    else:
        print("[FAIL] Some tests failed. Check the output for details.")
    
    print("\nTesting completed!")
