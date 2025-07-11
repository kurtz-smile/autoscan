// Sample student data structure (this would normally be in separate JSON files)
// Example: grade7-tesla.json
/*

*/

// Global variables
let videoStream = null;
let scanningInterval = null;
let currentGradeSection = null;

// DOM elements
const scannerVideo = document.getElementById('scanner');
const startScannerBtn = document.getElementById('startScanner');
const stopScannerBtn = document.getElementById('stopScanner');
const resetAllBtn = document.getElementById('resetAll');
const scanResultDiv = document.getElementById('scanResult');
const fullNameSpan = document.getElementById('fullName');
const gradeSpan = document.getElementById('grade');
const sectionSpan = document.getElementById('section');
const lrnSpan = document.getElementById('lrn');
const phoneSpan = document.getElementById('phone');
const statusSpan = document.getElementById('status');
const studentPhoto = document.getElementById('studentPhoto');
const attendanceLogs = document.getElementById('attendanceLogs');

// Event listeners
startScannerBtn.addEventListener('click', startScanner);
stopScannerBtn.addEventListener('click', stopScanner);
resetAllBtn.addEventListener('click', resetAllAttendance);

// Start QR code scanner
function startScanner() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(function(stream) {
            videoStream = stream;
            scannerVideo.srcObject = stream;
            scannerVideo.play();
            
            startScannerBtn.disabled = true;
            stopScannerBtn.disabled = false;
            
            // Start scanning for QR codes
            scanningInterval = setInterval(scanQRCode, 100);
        })
        .catch(function(err) {
            console.error("Error accessing camera: ", err);
            scanResultDiv.innerHTML = "<p class='denied'>Error accessing camera. Please ensure you've granted camera permissions.</p>";
        });
}

// Stop QR code scanner
function stopScanner() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    if (scanningInterval) {
        clearInterval(scanningInterval);
        scanningInterval = null;
    }
    
    scannerVideo.srcObject = null;
    startScannerBtn.disabled = false;
    stopScannerBtn.disabled = true;
}

// Scan for QR codes
function scanQRCode() {
    if (scannerVideo.readyState === scannerVideo.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas');
        canvas.width = scannerVideo.videoWidth;
        canvas.height = scannerVideo.videoHeight;
        const canvasContext = canvas.getContext('2d');
        canvasContext.drawImage(scannerVideo, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
            processQRCode(code.data);
        }
    }
}

// Process scanned QR code data
async function processQRCode(qrData) {
    try {
        // QR data format: "LRN:123456789012"
        if (!qrData.startsWith("LRN:")) {
            scanResultDiv.innerHTML = "<p class='denied'>Invalid QR code format. Please use a valid student QR code.</p>";
            return;
        }
        
        const lrn = qrData.split(":")[1];
        
        // Try to find the student in any of the grade-section files
        const student = await findStudentByLRN(lrn);
        
        if (!student) {
            scanResultDiv.innerHTML = "<p class='denied'>Student not found in any grade/section.</p>";
            return;
        }
        
        // Update current grade and section for saving
        currentGradeSection = `grade${student.grade}-${student.section.toLowerCase()}`;
        
        // Display student info
        displayStudentInfo(student);
        
        // Update attendance status
        updateAttendanceStatus(student);
        
        // Save the updated data
        await saveAttendanceData(currentGradeSection, student);
        
        // Add to logs
        addToLogs(student);
        
    } catch (error) {
        console.error("Error processing QR code:", error);
        scanResultDiv.innerHTML = `<p class='denied'>Error processing QR code: ${error.message}</p>`;
    }
}

// Find student by LRN in all grade-section files
async function findStudentByLRN(lrn) {
    // In a real implementation, you would need to scan through all possible grade-section files
    // For this example, we'll simulate checking multiple files
    
    // List of possible grade-section files (in a real app, you might generate this dynamically)
    const possibleFiles = [
        'grade7-tesla.json',
        'grade7-darwin.json',
        'grade8-charles.json',
        // Add all other grade-section combinations
    ];
    
    // Simulate checking each file (in a real app, you would fetch each file)
    for (const file of possibleFiles) {
        try {
            // Simulate fetching the file
            const response = await fetch(file);
            if (!response.ok) continue;
            
            const data = await response.json();
            const student = data.students.find(s => s.lrn === lrn);
            
            if (student) {
                return student;
            }
        } catch (error) {
            console.error(`Error checking file ${file}:`, error);
            continue;
        }
    }
    
    return null; // Student not found in any file
}

// Display student information
function displayStudentInfo(student) {
    fullNameSpan.textContent = student.fullName;
    gradeSpan.textContent = student.grade;
    sectionSpan.textContent = student.section;
    lrnSpan.textContent = student.lrn;
    phoneSpan.textContent = student.phone;
    
    if (student.photo) {
        studentPhoto.src = student.photo;
        studentPhoto.style.display = 'block';
    } else {
        studentPhoto.style.display = 'none';
    }
}

// Update attendance status
function updateAttendanceStatus(student) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Find today's attendance if it exists
    const todayAttendance = student.attendance.find(a => a.date === today);
    
    if (!todayAttendance) {
        // First scan of the day - mark as "In"
        student.attendance.push({
            date: today,
            timeIn: now.toISOString(),
            timeOut: null,
            status: 'In'
        });
        statusSpan.textContent = 'In';
        statusSpan.className = 'status-in';
        scanResultDiv.innerHTML = "<p class='status-in'>Attendance marked: IN</p>";
    } else if (todayAttendance.status === 'In') {
        // Already in - mark as "Out"
        todayAttendance.timeOut = now.toISOString();
        todayAttendance.status = 'Out';
        statusSpan.textContent = 'Out';
        statusSpan.className = 'status-out';
        scanResultDiv.innerHTML = "<p class='status-out'>Attendance marked: OUT</p>";
    } else {
        // Already out - toggle back to "In"
        todayAttendance.timeIn = now.toISOString();
        todayAttendance.timeOut = null;
        todayAttendance.status = 'In';
        statusSpan.textContent = 'In';
        statusSpan.className = 'status-in';
        scanResultDiv.innerHTML = "<p class='status-in'>Attendance marked: IN</p>";
    }
}

// Save attendance data to JSON file
async function saveAttendanceData(gradeSection, updatedStudent) {
    // In a real implementation, this would send data to a server to save
    // For this client-side example, we'll simulate it
    
    console.log(`Saving data to ${gradeSection}.json for student ${updatedStudent.fullName}`);
    
    // Simulate saving by storing in localStorage (in a real app, use server-side storage)
    const currentData = JSON.parse(localStorage.getItem(gradeSection) || '{"students": []}');
    
    // Update the student record
    const studentIndex = currentData.students.findIndex(s => s.lrn === updatedStudent.lrn);
    if (studentIndex !== -1) {
        currentData.students[studentIndex] = updatedStudent;
    } else {
        currentData.students.push(updatedStudent);
    }
    
    localStorage.setItem(gradeSection, JSON.stringify(currentData));
}

// Add attendance record to logs
function addToLogs(student) {
    const now = new Date();
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const todayAttendance = student.attendance.find(a => a.date === now.toISOString().split('T')[0]);
    
    logEntry.innerHTML = `
        <strong>${now.toLocaleString()}</strong> - 
        ${student.fullName} (Grade ${student.grade}-${student.section}) - 
        <span class="status-${todayAttendance.status.toLowerCase()}">${todayAttendance.status}</span>
    `;
    
    attendanceLogs.insertBefore(logEntry, attendanceLogs.firstChild);
}

// Reset all attendance data
async function resetAllAttendance() {
    if (!confirm("Are you sure you want to reset ALL attendance data? This cannot be undone.")) {
        return;
    }
    
    if (currentGradeSection) {
        try {
            // In a real implementation, this would send a request to the server
            // For this example, we'll clear the localStorage
            localStorage.removeItem(currentGradeSection);
            
            // Reset the display
            fullNameSpan.textContent = '-';
            gradeSpan.textContent = '-';
            sectionSpan.textContent = '-';
            lrnSpan.textContent = '-';
            phoneSpan.textContent = '-';
            statusSpan.textContent = '-';
            statusSpan.className = '';
            studentPhoto.style.display = 'none';
            
            scanResultDiv.innerHTML = "<p>All attendance data has been reset for this grade/section.</p>";
            attendanceLogs.innerHTML = '';
            
        } catch (error) {
            console.error("Error resetting attendance:", error);
            scanResultDiv.innerHTML = `<p class='denied'>Error resetting attendance: ${error.message}</p>`;
        }
    } else {
        scanResultDiv.innerHTML = "<p>No grade/section selected. Scan a student first.</p>";
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if browser supports camera access
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        scanResultDiv.innerHTML = "<p class='denied'>Camera access not supported by your browser.</p>";
        startScannerBtn.disabled = true;
    }
});