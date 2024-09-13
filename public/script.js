// Configuration
const CONFIG = {
    API_ENDPOINTS: {
        GENERATE_FEED: "/generate-feed",
        FEEDS: "/feeds",
        FEED: "/feed",
        URL_METADATA: "/url-metadata",
        FEED_STATUS: "/feed-status",
    },
    UI_STATES: {
        CREATE: "create",
        MANAGE: "manage",
        EDIT: "edit",
    },
};

// Utility Functions
function padZero(num) {
    return num.toString().padStart(2, "0");
}

function formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${padZero(hours)}:${padZero(minutes)} ${ampm}`;
}

function truncateText(text, maxLength) {
    return text.length > maxLength
        ? text.substring(0, maxLength - 1) + "…"
        : text;
}

function extractDomain(url) {
    try {
        const domain = new URL(url).hostname;
        return domain.replace(/^www\./, "");
    } catch (e) {
        return url;
    }
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return ['http:', 'https:'].includes(url.protocol);
    } catch (_) {
        return false;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add this function near the top of the file, with other utility functions
function getTimezoneAbbreviation(timezone) {
    const abbreviations = {
        "America/New_York": "EST",
        "America/Chicago": "CST",
        "America/Denver": "MST",
        "America/Los_Angeles": "PST",
        "America/Sao_Paulo": "BRT",
        "Europe/London": "GMT",
        "Europe/Paris": "CET",
        "Europe/Kiev": "EET",
        "Asia/Kolkata": "IST",
        "Asia/Shanghai": "CST",
        "Asia/Tokyo": "JST",
        "Australia/Sydney": "AEST",
        "Pacific/Auckland": "NZST"
    };

    return abbreviations[timezone] || timezone;
}

// API Calls
async function apiCall(url, method, data = null) {
    const options = {
        method: method,
        headers: {
            "Content-Type": "application/json",
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const contentType = response.headers.get("content-type");
        if (!response.ok) {
            let errorMessage;
            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                errorMessage = errorData.error || 'Unknown error';
            } else {
                errorMessage = await response.text();
            }
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorMessage}`);
        }
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        } else {
            const text = await response.text();
            console.warn("Received non-JSON response:", text);
            return { message: text };
        }
    } catch (error) {
        console.error("API call error:", error);
        throw error;
    }
}

// Error Handling and User Feedback
function handleError(error) {
    console.error("An error occurred:", error);
    let errorMessage = "An error occurred. Please try again.";
    if (error.response) {
        errorMessage += ` Server responded with: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
        errorMessage += " No response received from the server.";
    } else {
        errorMessage += ` Error message: ${error.message}`;
    }
    showFeedback(errorMessage, "error");
}

function showFeedback(message, type = "info") {
    const feedbackElement = document.getElementById("feedback");
    feedbackElement.textContent = message;
    feedbackElement.className = `feedback ${type}`;
    feedbackElement.style.display = "block";
    setTimeout(() => {
        feedbackElement.style.display = "none";
    }, 5000);
}

// UI Management
function updateUIState(state) {
    const sections = {
        [CONFIG.UI_STATES.CREATE]: document.getElementById("createFeedSection"),
        [CONFIG.UI_STATES.MANAGE]: document.getElementById("manageFeedsSection"),
        [CONFIG.UI_STATES.EDIT]: document.getElementById("editFeedSection"),
    };

    Object.keys(sections).forEach((key) => {
        sections[key].style.display = key === state ? "block" : "none";
    });

    document.getElementById("generatedFeedSection").style.display = "none";

    document.getElementById("createTabBtn").classList.toggle("active", state === CONFIG.UI_STATES.CREATE);
    document.getElementById("manageTabBtn").classList.toggle("active", state === CONFIG.UI_STATES.MANAGE);
}

function validateUrl(url) {
    try {
        new URL(url);
        return { valid: true, url: url };
    } catch (_) {
        return { valid: false, url: url };
    }
}

function addUrl(inputId, containerIdId) {
    console.log("Adding URL. Input ID:", inputId, "Container ID:", containerIdId);
    const urlInput = document.getElementById(inputId);
    const url = urlInput.value.trim();
    console.log("URL to add:", url);

    if (!url) {
        console.log("Empty URL");
        showFeedback("Please enter a URL", "error");
        return;
    }

    if (!isValidUrl(url)) {
        console.log("Invalid URL:", url);
        showFeedback("Please enter a valid URL (e.g., https://www.example.com)", "error");
        return;
    }

    console.log("Valid URL:", url);
    const addedUrlsContainer = document.getElementById(containerIdId);
    const urlElement = document.createElement("div");
    urlElement.className = "feed-item";
    urlElement.innerHTML = `
        <div class="feed-item-number">${addedUrlsContainer.children.length + 1}</div>
        <div class="feed-item-content">
            <div class="url-preview">
                <img src="default-favicon.png" alt="Default favicon">
                <div class="preview-content">
                    <div class="feed-item-title" title="${url}">Loading...</div>
                    <a href="${url}" class="preview-source" title="${url}" target="_blank" rel="noopener noreferrer">${extractDomain(url)}</a>
                </div>
            </div>
        </div>
        <button class="delete-url" onclick="deleteUrl(this)">×</button>
    `;
    addedUrlsContainer.appendChild(urlElement);

    updateUrlPreview(urlElement, url, addedUrlsContainer.children.length - 1, true);
    urlInput.value = "";
}

function updateUrlPreview(urlElement, url, index, isEditable = false) {
    console.log(`Updating preview for URL: ${url}`);
    if (!isValidUrl(url)) {
        console.log(`Invalid URL detected in updateUrlPreview: ${url}`);
        urlElement.innerHTML = `
            <div class="feed-item-number">${index + 1}</div>
            <div class="feed-item-content">
                <div class="feed-item-title" title="Invalid URL">Invalid URL</div>
                <div class="preview-source">${url}</div>
            </div>
            ${isEditable ? '<button class="delete-url" onclick="deleteUrl(this)">×</button>' : ''}
        `;
        return;
    }

    fetch(`${CONFIG.API_ENDPOINTS.URL_METADATA}?url=${encodeURIComponent(url)}`)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((metadata) => {
            console.log(`Metadata received for ${url}:`, metadata);
            urlElement.innerHTML = `
                <div class="feed-item-number">${index + 1}</div>
                <div class="feed-item-content">
                    <div class="url-preview">
                        <img src="${metadata.favicon}" alt="${metadata.siteName} favicon" onError="this.onerror=null;this.src='default-favicon.png';">
                        <div class="preview-content">
                            <div class="feed-item-title" title="${metadata.title || "Untitled"}">${truncateText(metadata.title || "Untitled", 50)}</div>
                            <a href="${url}" class="preview-source" title="${url}" target="_blank" rel="noopener noreferrer">${metadata.siteName || extractDomain(url)}</a>
                        </div>
                    </div>
                </div>
                ${isEditable ? '<button class="delete-url" onclick="deleteUrl(this)">×</button>' : ''}
            `;
        })
        .catch((error) => {
            console.error(`Error fetching metadata for ${url}:`, error);
            urlElement.innerHTML = `
                <div class="feed-item-number">${index + 1}</div>
                <div class="feed-item-content">
                    <div class="feed-item-title" title="${url}">${truncateText(url, 50)}</div>
                    <a href="${url}" class="preview-source" title="${url}" target="_blank" rel="noopener noreferrer">${extractDomain(url)}</a>
                </div>
                ${isEditable ? '<button class="delete-url" onclick="deleteUrl(this)">×</button>' : ''}
            `;
        });
}

function updateFeedItemNumbers() {
    const feedItems = document.querySelectorAll("#addedUrls .feed-item");
    feedItems.forEach((item, index) => {
        item.querySelector(".feed-item-number").textContent = index + 1;
    });
}

// Form Handling
function handleFeedForm(formId, submitUrl, successCallback) {
    const form = document.getElementById(formId);
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const feedData = Object.fromEntries(formData.entries());

        feedData.urls = Array.from(
            document.querySelectorAll(`#${formId === 'editFeedForm' ? 'editAddedUrls' : 'addedUrls'} .feed-item-content a`)
        ).map(a => a.href);

        if (feedData.urls.length === 0) {
            showFeedback("Please add at least one URL before submitting the feed.", "error");
            return;
        }

        feedData.repeat = form.querySelector('input[name="repeat"]').checked;

        console.log("Submitting feed data:", feedData);

        try {
            const response = await apiCall(submitUrl, formId === 'editFeedForm' ? 'PUT' : 'POST', feedData);
            console.log("Server response:", response);
            if (response && (response.feedId || response.updatedFeed)) {
                const feedId = response.feedId || response.updatedFeed.id;
                const feedUrl = `${window.location.origin}/feed/${feedId}`;
                successCallback({...feedData, ...response, feedId, feedUrl});
                if (formId === 'feedForm') {
                    resetCreateFeedForm();
                    displayGeneratedFeed({...feedData, ...response, feedId, feedUrl});
                }
                showFeedback(response.message || "Feed operation successful", "success");
            } else {
                throw new Error("Invalid server response");
            }
        } catch (error) {
            handleError(error);
        }
    });
}

// Feed Management
const FeedManager = {
    async loadFeeds() {
        try {
            const feeds = await apiCall(CONFIG.API_ENDPOINTS.FEEDS, "GET");
            if (Array.isArray(feeds)) {
                if (feeds.length === 0) {
                    this.displayNoFeeds();
                } else {
                    this.displayFeeds(feeds);
                }
            } else {
                throw new Error("Invalid response format");
            }
        } catch (error) {
            console.error("Error loading feeds:", error);
            showFeedback(`Error loading feeds: ${error.message}`, "error");
        }
    },

    displayNoFeeds() {
        const feedsList = document.getElementById("feedsList");
        feedsList.innerHTML = "<p>No feeds available. Create a new feed to get started!</p>";
    },

    displayFeeds(feeds) {
        const feedsList = document.getElementById("feedsList");
        feedsList.innerHTML = "";
        feeds.forEach((feed) => {
            const feedItem = document.createElement("div");
            feedItem.className = "generated-feed-item";
            feedItem.innerHTML = `
                <div class="feed-details">
                    <h3>${feed.name}</h3>
                    <p><strong>Delivered:</strong> Every ${feed.days} day(s) at ${feed.time} ${getTimezoneAbbreviation(feed.timezone)}</p>
                    <p><strong>Next Delivery:</strong> ${new Date(feed.nextDeliveryDate).toLocaleString()}</p>
                    <p><strong>Repeat:</strong> ${feed.repeat ? "Yes" : "No"}</p>
                </div>
                <div class="feed-actions">
                    <button onclick="copyFeedUrl('${window.location.origin}/feed/${feed.id}')" class="action-btn">Copy Feed URL</button>
                    <button onclick="FeedManager.showEditForm('${feed.id}')" class="action-btn">Edit Feed</button>
                    <button onclick="FeedManager.deleteFeed('${feed.id}')" class="action-btn">Delete Feed</button>
                </div>
                <h3>Feed Items:</h3>
                <div id="feedItems-${feed.id}" class="feed-items"></div>
            `;
            feedsList.appendChild(feedItem);

            // Populate feed items
            const feedItemsContainer = feedItem.querySelector(`#feedItems-${feed.id}`);
            console.log(`Feed ${feed.id} URLs:`, feed.urls); // Log the URLs

            if (Array.isArray(feed.urls) && feed.urls.length > 0) {
                feed.urls.forEach((urlObj, index) => {
                    let url;
                    if (typeof urlObj === 'string') {
                        url = urlObj;
                    } else if (urlObj && typeof urlObj === 'object') {
                        url = urlObj.url || (urlObj.url && urlObj.url.url);
                    } else {
                        url = null;
                    }
                    console.log(`Processing URL ${index}:`, url); // Log each URL being processed
                    const urlElement = document.createElement("div");
                    urlElement.className = "feed-item";
                    feedItemsContainer.appendChild(urlElement);
                    setTimeout(() => updateUrlPreview(urlElement, url, index, false), 0);
                });
            } else {
                console.warn(`No URLs found for feed ${feed.id}`);
                feedItemsContainer.innerHTML = "<p>No feed items available. Please edit this feed to add URLs.</p>";
            }
        });
    },

    async showEditForm(feedId) {
        console.log("Showing edit form for feed:", feedId);
        try {
            const feed = await apiCall(
                `${CONFIG.API_ENDPOINTS.FEEDS}/${feedId}`,
                "GET",
            );
            if (feed) {
                updateUIState(CONFIG.UI_STATES.EDIT);
                const editForm = document.getElementById("editFeedSection");
                editForm.innerHTML = `
                    <form id="editFeedForm">
                        <input type="hidden" id="editFeedId" value="${feed.id}">
                        <div>
                            <label for="editFeedName">Feed Name:</label>
                            <input type="text" id="editFeedName" name="name" value="${feed.name}" required>
                        </div>
                        <div id="editUrlInputContainer">
                            <label for="editUrlInput">Feed Items:</label>
                            <div class="url-input-group">
                                <input type="url" id="editUrlInput" placeholder="Enter URL">
                                <button type="button" id="editAddUrlButton">Add +</button>
                            </div>
                            <div id="editAddedUrls"></div>
                        </div>
                        <div class="interval-settings-container">
                            <div class="interval-settings">
                                Every
                                <input type="number" id="editDays" name="days" min="1" max="365" value="${feed.days}" required>
                                days at
                                <input type="time" id="editTime" name="time" value="${feed.time}" required>
                                <select id="editTimezone" name="timezone" required>
                                    <option value="">Select Timezone</option>
                                </select>
                                <span class="info-icon" onclick="toggleEditHelpText()">i</span>
                                <div class="repeat-option">
                                    <input type="checkbox" id="editRepeat" name="repeat" ${feed.repeat ? "checked" : ""}>
                                    <label for="editRepeat">Repeat?</label>
                                </div>
                            </div>
                            <div id="editHelpText" class="help-text">
                                Set how often your feed updates. Choose any interval between 1 and 365 days. The feed will update at the specified time in the selected time zone. For example, 'Every 7 days at 9:00 AM EST' will update your feed weekly at 9 AM Eastern Standard Time.
                            </div>
                        </div>
                        <button type="submit">Update Feed</button>
                    </form>
                `;

                const editAddedUrls = document.getElementById("editAddedUrls");
                console.log("Feed URLs:", feed.urls); // Log all URLs

                if (Array.isArray(feed.urls) && feed.urls.length > 0) {
                    feed.urls.forEach((urlObj, index) => {
                        console.log(`Processing URL object ${index}:`, urlObj);
                        let url;
                        if (typeof urlObj === 'string') {
                            url = urlObj;
                        } else if (urlObj && typeof urlObj === 'object') {
                            url = urlObj.url || (urlObj.url && urlObj.url.url);
                        } else {
                            url = null;
                        }
                        console.log(`Processing URL ${index}:`, url);
                        const urlElement = document.createElement("div");
                        urlElement.className = "feed-item";
                        editAddedUrls.appendChild(urlElement);
                        updateUrlPreview(urlElement, url, index, true);
                    });
                } else {
                    console.log("No URLs found in the feed");
                    editAddedUrls.innerHTML = "<p>No URLs found. Please add new URLs below.</p>";
                }

                document
                    .getElementById("editAddUrlButton")
                    .addEventListener("click", () => {
                        console.log("Edit Add URL button clicked");
                        addUrl("editUrlInput", "editAddedUrls");
                    });
                document
                    .getElementById("editUrlInput")
                    .addEventListener("keypress", function (event) {
                        if (event.key === "Enter") {
                            console.log("Enter key pressed in edit URL input");
                            event.preventDefault();
                            addUrl("editUrlInput", "editAddedUrls");
                        }
                    });

                populateTimezones("editTimezone");
                document.getElementById("editTimezone").value = feed.timezone;

                handleFeedForm(
                    "editFeedForm",
                    `${CONFIG.API_ENDPOINTS.FEED}/${feedId}`,
                    () => {
                        showFeedback("Feed updated successfully!", "success");
                        this.loadFeeds();
                        updateUIState(CONFIG.UI_STATES.MANAGE);
                    },
                );
            }
        } catch (error) {
            handleError(error);
        }
    },

    async deleteFeed(feedId) {
        if (confirm("Are you sure you want to delete this feed?")) {
            try {
                await apiCall(
                    `${CONFIG.API_ENDPOINTS.FEED}/${feedId}`,
                    "DELETE",
                );
                showFeedback("Feed deleted successfully!", "success");
                this.loadFeeds();
            } catch (error) {
                handleError(error);
            }
        }
    },

    copyFeedLink(feedId) {
        const feedUrl = `${window.location.origin}${CONFIG.API_ENDPOINTS.FEED}/${feedId}`;
        navigator.clipboard
            .writeText(feedUrl)
            .then(() =>
                showFeedback("Feed URL copied to clipboard!", "success"),
            )
            .catch((error) => handleError(error));
    },

    showEmbedCode(feedId) {
        const embedCode = `<iframe src="${window.location.origin}/embed/${feedId}" width="100%" height="400" frameborder="0"></iframe>`;
        const targetElement = document.querySelector(
            `#feedsList .feed-item:has(button[onclick="FeedManager.showEmbedCode('${feedId}')"])`,
        );

        let embedDisplay = targetElement.querySelector(".embed-display");
        const embedButton = targetElement.querySelector(
            'button[onclick^="FeedManager.showEmbedCode"]',
        );

        if (embedDisplay) {
            if (embedDisplay.style.display === "none") {
                embedDisplay.style.display = "block";
                embedButton.textContent = "Hide Embed Code";
            } else {
                embedDisplay.style.display = "none";
                embedButton.textContent = "Show Embed Code";
            }
        } else {
            embedDisplay = document.createElement("div");
            embedDisplay.className = "embed-display";
            embedDisplay.innerHTML = `
                <h3>Embed Code:</h3>
                <textarea readonly>${embedCode}</textarea>
            `;
            targetElement.appendChild(embedDisplay);
            embedButton.textContent = "Hide Embed Code";
        }

        document.querySelectorAll(".embed-display").forEach((display) => {
            if (display !== embedDisplay) {
                display.style.display = "none";
                const button = display.parentElement.querySelector(
                    'button[onclick^="FeedManager.showEmbedCode"]',
                );
                if (button) button.textContent = "Show Embed Code";
            }
        });
    },
};

function setDefaultTimeAndTimezone() {
    const now = new Date();
    const timeInput = document.getElementById("time");
    timeInput.value = formatTime(now);

    const timezoneSelect = document.getElementById("timezone");
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    timezoneSelect.value = findClosestTimezone(userTimeZone);
}

function findClosestTimezone(userTimeZone) {
    const timezoneSelect = document.getElementById("timezone");
    const options = Array.from(timezoneSelect.options);
    
    return options.reduce((closest, option) => {
        if (option.value === userTimeZone) return option.value;
        if (Math.abs(getTimezoneOffset(option.value) - getTimezoneOffset(userTimeZone)) <
            Math.abs(getTimezoneOffset(closest) - getTimezoneOffset(userTimeZone))) {
            return option.value;
        }
        return closest;
    }, "UTC");
}

function getTimezoneOffset(timezone) {
    const date = new Date();
    const options = { timeZone: timezone, timeZoneName: 'short' };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find(part => part.type === 'timeZoneName');
    const offset = offsetPart ? offsetPart.value : '';
    return parseInt(offset.replace('GMT', '').replace(':', ''), 10);
}

function populateTimezones(selectId) {
    const timezoneSelect = document.getElementById(selectId);
    const commonTimezones = [
        { name: "UTC", value: "UTC" },
        { name: "EST (US Eastern)", value: "America/New_York" },
        { name: "CST (US Central)", value: "America/Chicago" },
        { name: "MST (US Mountain)", value: "America/Denver" },
        { name: "PST (US Pacific)", value: "America/Los_Angeles" },
        { name: "BRT (Brazil)", value: "America/Sao_Paulo" },
        { name: "GMT (UK)", value: "Europe/London" },
        { name: "CET (Central Europe)", value: "Europe/Paris" },
        { name: "EET (Eastern Europe)", value: "Europe/Kiev" },
        { name: "IST (India)", value: "Asia/Kolkata" },
        { name: "CST (China)", value: "Asia/Shanghai" },
        { name: "JST (Japan)", value: "Asia/Tokyo" },
        { name: "AEST (Australia Eastern)", value: "Australia/Sydney" },
        { name: "NZST (New Zealand)", value: "Pacific/Auckland" }
    ];

    commonTimezones.forEach((tz) => {
        const option = document.createElement("option");
        option.value = tz.value;
        option.textContent = tz.name;
        timezoneSelect.appendChild(option);
    });
}

function displayGeneratedFeed(feedData) {
    const generatedFeedSection = document.getElementById("generatedFeedSection");
    const generatedFeedContent = document.getElementById("generatedFeedContent");
    
    if (!feedData || !feedData.feedUrl || !feedData.feedId) {
        console.error("Invalid feed data:", feedData);
        showFeedback("Error displaying generated feed. Please try again.", "error");
        return;
    }
    
    generatedFeedContent.innerHTML = `
        <div class="feed-details">
            <p><strong>Feed Name:</strong> ${feedData.name || 'Unnamed Feed'}</p>
            <p><strong>Delivered:</strong> Every ${feedData.days || '1'} day(s) at ${feedData.time || '12:00 PM'} ${getTimezoneAbbreviation(feedData.timezone || 'UTC')}</p>
        </div>
        <div class="feed-actions">
            <button onclick="copyFeedUrl('${feedData.feedUrl}')" class="action-btn">Copy Feed URL</button>
            <button onclick="editFeed('${feedData.feedId}')" class="action-btn">Edit Feed</button>
        </div>
        <h3>Feed Items:</h3>
        <div id="generatedFeedItems"></div>
    `;
    
    const feedItemsContainer = document.getElementById("generatedFeedItems");
    if (Array.isArray(feedData.urls) && feedData.urls.length > 0) {
        feedData.urls.forEach((urlObj, index) => {
            let url;
            if (typeof urlObj === 'string') {
                url = urlObj;
            } else if (urlObj && typeof urlObj === 'object') {
                url = urlObj.url || (urlObj.url && urlObj.url.url);
            } else {
                url = null;
            }
            console.log(`Processing URL ${index}:`, url);
            const urlElement = document.createElement("div");
            urlElement.className = "feed-item";
            feedItemsContainer.appendChild(urlElement);
            updateUrlPreview(urlElement, url, index, false);
        });
    } else {
        console.warn(`No URLs found for generated feed`);
        feedItemsContainer.innerHTML = "<p>No feed items available. Please edit this feed to add URLs.</p>";
    }
    
    generatedFeedSection.style.display = "block";
    document.getElementById("createFeedSection").style.display = "none";
}

function copyFeedUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        showFeedback("Feed URL copied to clipboard!", "success");
    });
}

function editFeed(feedId) {
    FeedManager.showEditForm(feedId);
}

function resetCreateFeedForm() {
    document.getElementById("feedForm").reset();
    document.getElementById("addedUrls").innerHTML = "";
}

function toggleHelpText() {
    console.log('toggleHelpText called'); // Debug log
    const helpText = document.getElementById('helpText');
    if (helpText) {
        console.log('Current display:', helpText.style.display); // Debug log
        helpText.style.display = helpText.style.display === 'none' || helpText.style.display === '' ? 'block' : 'none';
        console.log('New display:', helpText.style.display); // Debug log
    } else {
        console.error('Help text element not found');
    }
}

function toggleEditHelpText() {
    const editHelpText = document.getElementById('editHelpText');
    if (editHelpText) {
        editHelpText.style.display = editHelpText.style.display === 'none' ? 'block' : 'none';
    } else {
        console.error('Edit help text element not found');
    }
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    setDefaultTimeAndTimezone();
    populateTimezones("timezone");

    document
        .getElementById("addUrlButton")
        .addEventListener("click", () => addUrl("urlInput", "addedUrls"));
    document
        .getElementById("urlInput")
        .addEventListener("keypress", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                addUrl("urlInput", "addedUrls");
            }
        });

    document
        .getElementById("createTabBtn")
        .addEventListener("click", () =>
            updateUIState(CONFIG.UI_STATES.CREATE),
        );
    document.getElementById("manageTabBtn").addEventListener("click", () => {
        updateUIState(CONFIG.UI_STATES.MANAGE);
        FeedManager.loadFeeds();
    });

    handleFeedForm("feedForm", CONFIG.API_ENDPOINTS.GENERATE_FEED, (data) => {
        if (data.feedId) {
            const feedUrl = `${window.location.origin}${CONFIG.API_ENDPOINTS.FEED}/${data.feedId}`;
            displayGeneratedFeed({...data, feedUrl});
        } else {
            console.error("No feedId in response");
            showFeedback("Error creating feed. Please try again.", "error");
        }
    });

    // Add event listeners for info icons
    const infoIcon = document.getElementById('intervalInfoIcon');
    if (infoIcon) {
        console.log('Info icon found, adding event listener'); // Debug log
        infoIcon.addEventListener('click', toggleHelpText);
    } else {
        console.error('Info icon element not found');
    }

    // Initial UI state
    updateUIState(CONFIG.UI_STATES.CREATE);
});

// Export FeedManager for global access
window.FeedManager = FeedManager;

function deleteUrl(button) {
    const feedItem = button.closest('.feed-item');
    if (feedItem) {
        feedItem.remove();
        updateFeedItemNumbers();
    }
}

function updateFeedItemNumbers() {
    const feedItems = document.querySelectorAll('.feed-item');
    feedItems.forEach((item, index) => {
        const numberElement = item.querySelector('.feed-item-number');
        if (numberElement) {
            numberElement.textContent = index + 1;
        }
    });
}
