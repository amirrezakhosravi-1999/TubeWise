// Key Points Frontend Test
// This test script checks if the key points are correctly displayed in the frontend

// Mock data for testing
const mockSummary = {
  videoId: "dQw4w9WgXcQ",
  title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
  summary: "The text is a song called 'Never Gonna Give You Up' by Rick Astley...",
  keyPoints: [
    { timestamp: "0:10", point: "The video starts with background music playing." },
    { timestamp: "1:30", point: "The lyrics mention a commitment and strong feelings towards someone." },
    { timestamp: "2:45", point: "The lyrics express a promise to never give up, let down, or hurt the person." }
  ]
};

// Test functions
function testKeyPointsDisplay() {
  console.log("Testing Key Points Display...");
  
  // Create a mock DOM environment
  document.body.innerHTML = `
    <div id="key-points-container">
      <h2>Key Points with Timestamps</h2>
      <ul id="key-points-list"></ul>
      <p id="no-key-points-message" style="display: none;">No key points available</p>
    </div>
  `;
  
  const keyPointsList = document.getElementById("key-points-list");
  const noKeyPointsMessage = document.getElementById("no-key-points-message");
  
  // Test case 1: Display key points when available
  console.log("Test Case 1: Display key points when available");
  displayKeyPoints(mockSummary.keyPoints);
  
  // Check if key points are displayed correctly
  const listItems = keyPointsList.querySelectorAll("li");
  console.log(`Number of key points displayed: ${listItems.length}`);
  console.assert(listItems.length === mockSummary.keyPoints.length, 
    `Expected ${mockSummary.keyPoints.length} key points, but got ${listItems.length}`);
  
  // Check if the content of each key point is correct
  listItems.forEach((item, index) => {
    const timestamp = item.querySelector(".timestamp").textContent;
    const point = item.querySelector(".point").textContent;
    
    console.log(`Key Point ${index + 1}:`);
    console.log(`  Timestamp: ${timestamp}`);
    console.log(`  Point: ${point}`);
    
    console.assert(timestamp === mockSummary.keyPoints[index].timestamp, 
      `Expected timestamp ${mockSummary.keyPoints[index].timestamp}, but got ${timestamp}`);
    console.assert(point === mockSummary.keyPoints[index].point, 
      `Expected point "${mockSummary.keyPoints[index].point}", but got "${point}"`);
  });
  
  // Test case 2: Display message when no key points are available
  console.log("\nTest Case 2: Display message when no key points are available");
  displayKeyPoints([]);
  
  // Check if the "No key points available" message is displayed
  console.log(`No key points message display: ${noKeyPointsMessage.style.display}`);
  console.assert(noKeyPointsMessage.style.display === "block", 
    `Expected "No key points available" message to be displayed`);
  
  console.log("\nKey Points Display Test completed!");
}

// Helper function to display key points
function displayKeyPoints(keyPoints) {
  const keyPointsList = document.getElementById("key-points-list");
  const noKeyPointsMessage = document.getElementById("no-key-points-message");
  
  // Clear previous content
  keyPointsList.innerHTML = "";
  
  if (keyPoints && keyPoints.length > 0) {
    // Display key points
    keyPoints.forEach(point => {
      const listItem = document.createElement("li");
      
      const timestampSpan = document.createElement("span");
      timestampSpan.className = "timestamp";
      timestampSpan.textContent = point.timestamp;
      
      const pointSpan = document.createElement("span");
      pointSpan.className = "point";
      pointSpan.textContent = point.point;
      
      listItem.appendChild(timestampSpan);
      listItem.appendChild(document.createTextNode(" - "));
      listItem.appendChild(pointSpan);
      
      keyPointsList.appendChild(listItem);
    });
    
    // Hide the "No key points available" message
    noKeyPointsMessage.style.display = "none";
  } else {
    // Show the "No key points available" message
    noKeyPointsMessage.style.display = "block";
  }
}

// Run the test
testKeyPointsDisplay();
