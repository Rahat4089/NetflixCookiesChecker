// DOM Elements
const cookieInput = document.getElementById('cookie-input');
const loadFileBtn = document.getElementById('load-file-btn');
const pasteBtn = document.getElementById('paste-btn');
const clearBtn = document.getElementById('clear-btn');
const generateBtn = document.getElementById('generate-btn');
const progress = document.getElementById('progress');
const status = document.getElementById('status');
const results = document.getElementById('results');
const copyResultsBtn = document.getElementById('copy-results-btn');
const modeOptions = document.querySelectorAll('.mode-option');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const batchFiles = document.getElementById('batch-files');
const fileList = document.getElementById('file-list');
const processBatchBtn = document.getElementById('process-batch-btn');
const batchProgress = document.getElementById('batch-progress');
const batchStatus = document.getElementById('batch-status');
const batchResults = document.getElementById('batch-results');
const saveResultsBtn = document.getElementById('save-results-btn');
const totalFiles = document.getElementById('total-files');
const validFiles = document.getElementById('valid-files');
const invalidFiles = document.getElementById('invalid-files');
const notification = document.getElementById('notification');

// Global variables
let currentMode = 'fullinfo';
let selectedFiles = [];
let batchResultsData = [];

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
loadFileBtn.addEventListener('click', handleLoadFile);
pasteBtn.addEventListener('click', handlePaste);
clearBtn.addEventListener('click', handleClear);
generateBtn.addEventListener('click', handleGenerate);
copyResultsBtn.addEventListener('click', handleCopyResults);
modeOptions.forEach(option => {
    option.addEventListener('click', handleModeChange);
});
tabs.forEach(tab => {
    tab.addEventListener('click', handleTabChange);
});
batchFiles.addEventListener('change', handleBatchFilesChange);
processBatchBtn.addEventListener('click', handleProcessBatch);
saveResultsBtn.addEventListener('click', handleSaveResults);

// Initialize the application
function initApp() {
    updateFileList();
}

// Handle mode change (Full Info / Token Only)
function handleModeChange(e) {
    const mode = e.target.dataset.mode;
    currentMode = mode;
    
    modeOptions.forEach(option => {
        option.classList.remove('active');
    });
    
    e.target.classList.add('active');
}

// Handle tab change
function handleTabChange(e) {
    const tabId = e.target.dataset.tab;
    
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    e.target.classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

// Handle load file
function handleLoadFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json,.zip';
    
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = e => {
            cookieInput.value = e.target.result;
            showNotification('File loaded successfully');
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// Handle paste from clipboard
function handlePaste() {
    navigator.clipboard.readText()
        .then(text => {
            cookieInput.value = text;
            showNotification('Content pasted from clipboard');
        })
        .catch(err => {
            showNotification('Failed to read clipboard', true);
        });
}

// Handle clear input
function handleClear() {
    cookieInput.value = '';
    showNotification('Input cleared');
}

// Handle generate token
async function handleGenerate() {
    const content = cookieInput.value.trim();
    if (!content) {
        showNotification('Please enter some content first', true);
        return;
    }
    
    // Disable button and show progress
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="spinner"></div> Processing...';
    progress.style.width = '0%';
    status.textContent = 'Extracting NetflixId...';
    
    try {
        const response = await fetch('/api/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content,
                mode: currentMode
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            progress.style.width = '100%';
            status.textContent = 'Processing complete';
            displayResults(data);
            showNotification('Token generated successfully');
        } else {
            progress.style.width = '100%';
            status.textContent = 'Processing failed';
            displayError(data.message);
            showNotification(data.message, true);
        }
    } catch (error) {
        progress.style.width = '100%';
        status.textContent = 'Processing failed';
        displayError('Network error: ' + error.message);
        showNotification('Network error: ' + error.message, true);
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-key"></i> Generate Token';
    }
}

// Handle copy results
function handleCopyResults() {
    const resultsText = results.innerText;
    navigator.clipboard.writeText(resultsText)
        .then(() => {
            showNotification('Results copied to clipboard');
        })
        .catch(err => {
            showNotification('Failed to copy results', true);
        });
}

// Handle batch files change
function handleBatchFilesChange(e) {
    selectedFiles = Array.from(e.target.files);
    updateFileList();
}

// Update file list display
function updateFileList() {
    fileList.innerHTML = '';
    
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '<div class="file-item"><span>No files selected</span></div>';
        return;
    }
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>${file.name}</span>
            <span class="file-status">Pending</span>
        `;
        fileList.appendChild(fileItem);
    });
    
    totalFiles.textContent = selectedFiles.length;
    validFiles.textContent = '0';
    invalidFiles.textContent = '0';
}

// Update file list to show processing status
function updateFileListProcessing() {
    fileList.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>${file.name}</span>
            <span class="file-status processing">Processing...</span>
        `;
        fileList.appendChild(fileItem);
    });
}

// Handle process batch
async function handleProcessBatch() {
    if (selectedFiles.length === 0) {
        showNotification('Please select files first', true);
        return;
    }
    
    // Reset results
    batchResultsData = [];
    batchResults.innerHTML = '';
    saveResultsBtn.disabled = true;
    
    // Disable button and show progress
    processBatchBtn.disabled = true;
    processBatchBtn.innerHTML = '<div class="spinner"></div> Processing...';
    batchProgress.style.width = '0%';
    batchStatus.textContent = 'Processing batch...';
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
        formData.append('files', file);
    });
    formData.append('mode', currentMode);
    
    try {
        // Update file list status to processing
        updateFileListProcessing();
        
        const response = await fetch('/api/batch-check', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            batchResultsData = data.results;
            displayBatchResults(batchResultsData);
            batchProgress.style.width = '100%';
            batchStatus.textContent = 'Batch processing complete';
            saveResultsBtn.disabled = false;
            showNotification(`Batch processing completed: ${batchResultsData.filter(r => r.status === 'success').length} valid, ${batchResultsData.filter(r => r.status === 'error').length} invalid`);
        } else {
            batchProgress.style.width = '100%';
            batchStatus.textContent = 'Batch processing failed';
            showNotification(data.message, true);
        }
    } catch (error) {
        batchProgress.style.width = '100%';
        batchStatus.textContent = 'Batch processing failed';
        showNotification('Network error: ' + error.message, true);
    } finally {
        processBatchBtn.disabled = false;
        processBatchBtn.innerHTML = '<i class="fas fa-cogs"></i> Process Batch';
    }
}

// Display batch results in detailed single line format
function displayBatchResults(results) {
    batchResults.innerHTML = '';
    
    let validCount = 0;
    let invalidCount = 0;
    
    results.forEach(result => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item single-line-result';
        
        if (result.status === 'success') {
            const account = result.account_info;
            const token = result.token_result;
            
            let statusText = `✅ ${result.filename} | `;
            statusText += `Status: ${account.ok ? 'Valid' : 'Invalid'} | `;
            statusText += `Premium: ${account.premium ? 'Yes' : 'No'} | `;
            statusText += `Country: ${account.country} | `;
            statusText += `Plan: ${account.plan} | `;
            statusText += `Price: ${account.plan_price} | `;
            statusText += `Payment Hold: ${account.on_payment_hold} | `;
            statusText += `Max Streams: ${account.max_streams}`;
            
            if (token.status === 'Success') {
                statusText += ` | Token: ${token.token.substring(0, 15)}...`;
            }
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <span>${statusText}</span>
                </div>
                <span class="file-status valid">Valid</span>
            `;
            validCount++;
        } else {
            fileItem.innerHTML = `
                <div class="file-info">
                    <span>❌ ${result.filename}: ${result.message}</span>
                </div>
                <span class="file-status invalid">Invalid</span>
            `;
            invalidCount++;
        }
        
        batchResults.appendChild(fileItem);
    });
    
    validFiles.textContent = validCount;
    invalidFiles.textContent = invalidCount;
    
    // Update success rate
    const successRate = ((validCount / results.length) * 100).toFixed(2);
    batchStatus.textContent = `Complete - Success Rate: ${successRate}%`;
}

// Handle save results
function handleSaveResults() {
    if (batchResultsData.length === 0) {
        showNotification('No results to save', true);
        return;
    }
    
    let content = 'Netflix Token Generator - Batch Results\n';
    content += 'Generated on: ' + new Date().toLocaleString() + '\n';
    content += 'Created by: t.me/still_alivenow (Ichigo Kurosaki)\n\n';
    content += '='.repeat(80) + '\n\n';
    
    let validCount = 0;
    let invalidCount = 0;
    
    batchResultsData.forEach(result => {
        if (result.status === 'success') {
            validCount++;
            const account = result.account_info;
            const token = result.token_result;
            
            content += `✅ ${result.filename}\n`;
            content += `NetflixId: ${result.netflix_id}\n`;
            content += `Status: ${account.ok ? 'Valid' : 'Invalid'}\n`;
            content += `Premium: ${account.premium ? 'Yes' : 'No'}\n`;
            content += `Country: ${account.country}\n`;
            content += `Plan: ${account.plan}\n`;
            content += `Price: ${account.plan_price}\n`;
            content += `Member Since: ${account.member_since}\n`;
            content += `Payment Method: ${account.payment_method}\n`;
            content += `Phone: ${account.phone}\n`;
            content += `Phone Verified: ${account.phone_verified}\n`;
            content += `Video Quality: ${account.video_quality}\n`;
            content += `Max Streams: ${account.max_streams}\n`;
            content += `Payment Hold: ${account.on_payment_hold}\n`;
            content += `Extra Member: ${account.extra_member}\n`;
            content += `Email: ${account.email}\n`;
            content += `Email Verified: ${account.email_verified}\n`;
            content += `Profiles: ${account.profiles}\n`;
            content += `Billing: ${account.next_billing}\n`;
            
            if (token.status === 'Success') {
                content += `Token: ${token.token}\n`;
                content += `Login URL: ${token.direct_login_url}\n`;
                content += `Token Expires: ${new Date(token.expires * 1000).toLocaleString()}\n`;
                content += `Time Remaining: ${Math.floor(token.time_remaining / 86400)}d ${Math.floor((token.time_remaining % 86400) / 3600)}h ${Math.floor((token.time_remaining % 3600) / 60)}m\n`;
            } else {
                content += `Token Error: ${token.error}\n`;
            }
            
            content += '\n' + '─'.repeat(80) + '\n\n';
        } else {
            invalidCount++;
            content += `❌ ${result.filename}: ${result.message}\n\n`;
            content += '─'.repeat(80) + '\n\n';
        }
    });
    
    content += `\nSUMMARY\n`;
    content += `Total Files: ${batchResultsData.length}\n`;
    content += `Valid: ${validCount}\n`;
    content += `Invalid: ${invalidCount}\n`;
    content += `Success Rate: ${((validCount / batchResultsData.length) * 100).toFixed(2)}%\n`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netflix_batch_results_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Results saved successfully');
}

// Display results
function displayResults(data) {
    let html = '';
    
    if (currentMode === 'fullinfo') {
        const account = data.account_info;
        html = `
            <div class="result-item">
                <div class="result-title">
                    <i class="fas fa-check-circle" style="color: var(--success);"></i>
                    ACCOUNT INFORMATION
                </div>
                <div class="result-content">
                    <div><strong>Status:</strong> ${account.ok ? 'Valid' : 'Invalid'}</div>
                    <div><strong>Premium:</strong> ${account.premium ? 'Yes' : 'No'}</div>
                    <div><strong>Country:</strong> ${account.country}</div>
                    <div><strong>Plan:</strong> ${account.plan}</div>
                    <div><strong>Price:</strong> ${account.plan_price}</div>
                    <div><strong>Member Since:</strong> ${account.member_since}</div>
                    <div><strong>Payment Method:</strong> ${account.payment_method}</div>
                    <div><strong>Phone:</strong> ${account.phone}</div>
                    <div><strong>Phone Verified:</strong> ${account.phone_verified}</div>
                    <div><strong>Video Quality:</strong> ${account.video_quality}</div>
                    <div><strong>Max Streams:</strong> ${account.max_streams}</div>
                    <div><strong>Payment Hold:</strong> ${account.on_payment_hold}</div>
                    <div><strong>Extra Member:</strong> ${account.extra_member}</div>
                    <div><strong>Email:</strong> ${account.email}</div>
                    <div><strong>Email Verified:</strong> ${account.email_verified}</div>
                    <div><strong>Profiles:</strong> ${account.profiles}</div>
                    <div><strong>Billing:</strong> ${account.next_billing}</div>
                </div>
            </div>
        `;
    }
    
    const token = data.token_result;
    if (token.status === 'Success') {
        const genTime = new Date(token.generation_time * 1000).toLocaleString();
        const expTime = new Date(token.expires * 1000).toLocaleString();
        
        const timeRemaining = token.time_remaining;
        const days = Math.floor(timeRemaining / 86400);
        const hours = Math.floor((timeRemaining % 86400) / 3600);
        const minutes = Math.floor((timeRemaining % 3600) / 60);
        const seconds = timeRemaining % 60;
        
        html += `
            <div class="result-item">
                <div class="result-title">
                    <i class="fas fa-check-circle" style="color: var(--success);"></i>
                    TOKEN INFORMATION
                </div>
                <div class="result-content">
                    <div><strong>Status:</strong> ${token.status}</div>
                    <div><strong>Generation Time:</strong> ${genTime}</div>
                    <div><strong>Expiry:</strong> ${expTime}</div>
                    <div><strong>Time Remaining:</strong> ${days}d ${hours}h ${minutes}m ${seconds}s</div>
                    <div><strong>Token:</strong> ${token.token}</div>
                    <div><strong>Direct Login URL:</strong> 
                        <span class="token-url">${token.direct_login_url}</span>
                    </div>
                </div>
                <button class="copy-btn" data-text="${token.direct_login_url}">
                    <i class="fas fa-copy"></i> Copy URL
                </button>
            </div>
        `;
    } else {
        html += `
            <div class="result-item">
                <div class="result-title">
                    <i class="fas fa-times-circle" style="color: var(--danger);"></i>
                    TOKEN GENERATION FAILED
                </div>
                <div class="result-content">
                    <div><strong>Error:</strong> ${token.error}</div>
                </div>
            </div>
        `;
    }
    
    results.innerHTML = html;
    copyResultsBtn.disabled = false;
    
    // Add event listeners to copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const text = this.dataset.text;
            navigator.clipboard.writeText(text)
                .then(() => {
                    showNotification('URL copied to clipboard');
                })
                .catch(err => {
                    showNotification('Failed to copy URL', true);
                });
        });
    });
}

// Display error
function displayError(message) {
    results.innerHTML = `
        <div class="result-item">
            <div class="result-title">
                <i class="fas fa-times-circle" style="color: var(--danger);"></i>
                Error
            </div>
            <div class="result-content">
                ${message}
            </div>
        </div>
    `;
    copyResultsBtn.disabled = false;
}

// Show notification
function showNotification(message, isError = false) {
    notification.textContent = message;
    notification.className = 'notification';
    
    if (isError) {
        notification.classList.add('error');
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}