const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs").promises;
const RSS = require("rss");
const cron = require("node-cron");
const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment-timezone");
const NodeCache = require("node-cache");
const path = require("path");

const app = express();

const urlMetadataCache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.set("view engine", "ejs");

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

async function getUrlMetadata(url) {
    if (!url) {
        console.error("Attempted to fetch metadata for null or undefined URL");
        return {
            title: "Unknown",
            author: "Unknown",
            siteName: "Unknown",
            favicon: "default-favicon.png"
        };
    }

    const cacheKey = `metadata_${url}`;
    const cachedData = urlMetadataCache.get(cacheKey);

    if (cachedData) {
        return cachedData;
    }

    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const metadata = {
            title: $("title").text() || url,
            author: $('meta[name="author"]').attr("content") || "Unknown",
            siteName:
                $('meta[property="og:site_name"]').attr("content") ||
                new URL(url).hostname,
            favicon: `https://www.google.com/s2/favicons?domain=${
                new URL(url).hostname
            }`,
        };
        urlMetadataCache.set(cacheKey, metadata);
        return metadata;
    } catch (error) {
        console.error(`Error fetching metadata for ${url}:`, error);
        const fallbackMetadata = {
            title: url,
            author: "Unknown",
            siteName: new URL(url).hostname,
            favicon: `https://www.google.com/s2/favicons?domain=${
                new URL(url).hostname
            }`,
        };
        urlMetadataCache.set(cacheKey, fallbackMetadata);
        return fallbackMetadata;
    }
}

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

function getNextDeliveryDate(days, time, timezone, startDate) {
    // Set default time to 12:00 PM if not provided
    const defaultTime = "12:00 PM";
    time = time || defaultTime;

    let nextDelivery = moment.tz(startDate, timezone);

    // Parse the time string
    const parsedTime = moment(time, ["h:mm A", "HH:mm"]);

    nextDelivery.hours(parsedTime.hours());
    nextDelivery.minutes(parsedTime.minutes());
    nextDelivery.seconds(0);

    // If the calculated time is in the past, add the specified number of days
    if (nextDelivery.isBefore(moment())) {
        nextDelivery = nextDelivery.add(days, "days");
    }

    return nextDelivery.toDate();
}

app.post("/generate-feed", async (req, res) => {
    const { name, urls, days, time, timezone, repeat } = req.body;
    console.log("Received feed generation request:", { name, urls, days, time, timezone, repeat });
    
    if (!urls || urls.length === 0) {
        return res.status(400).json({ error: "No URLs provided" });
    }

    const feedId = Date.now().toString();
    const startDate = new Date();
    const feed = {
        id: feedId,
        name: name,
        urls: urls.map(url => ({ url, valid: isValidUrl(url) })),
        days: parseInt(days),
        time: time || "12:00 PM",
        timezone: timezone,
        currentIndex: 0,
        nextDeliveryDate: getNextDeliveryDate(days, time, timezone, startDate),
        repeat: repeat,
    };

    console.log("Saving new feed:", JSON.stringify(feed, null, 2));

    try {
        const feeds = JSON.parse(await fs.readFile("feeds.json", "utf8"));
        feeds[feedId] = feed;
        await fs.writeFile("feeds.json", JSON.stringify(feeds, null, 2));
        res.json({ feedId: feedId });
    } catch (error) {
        console.error("Error saving feed:", error);
        res.status(500).json({ error: "Error generating feed" });
    }
});

app.get("/feed/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const feeds = JSON.parse(await fs.readFile("feeds.json", "utf8"));
        const feed = feeds[id];
        if (!feed) {
            return res.status(404).send("Feed not found");
        }

        console.log("Generating RSS for feed:", feed);

        const rss = new RSS({
            title: feed.name,
            description: `A custom RSS feed generated by cozy feeds`,
            feed_url: `https://${req.headers.host}/feed/${id}`,
            site_url: `https://${req.headers.host}`,
        });

        // Filter out invalid URLs
        const validUrls = feed.urls.filter(url => url.valid).map(url => url.url);

        if (validUrls.length === 0) {
            return res.status(404).send("No valid URLs found in this feed");
        }

        const currentUrl = validUrls[feed.currentIndex % validUrls.length];
        console.log("Current URL for RSS item:", currentUrl);

        const metadata = await getUrlMetadata(currentUrl);

        rss.item({
            title: metadata.title,
            description: `Link to ${currentUrl}`,
            url: currentUrl,
            author: metadata.author,
            date: new Date(),
            custom_elements: [
                { "site:name": metadata.siteName },
                { "site:favicon": metadata.favicon },
            ],
        });

        res.type("application/rss+xml");
        res.send(rss.xml());
    } catch (error) {
        console.error("Error generating RSS:", error);
        res.status(500).send("Error generating RSS feed");
    }
});

app.get("/feed-status/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const feeds = JSON.parse(await fs.readFile("feeds.json", "utf8"));
        const feed = feeds[id];
        if (!feed) {
            return res.status(404).send("Feed not found");
        }
        res.json({
            currentUrl: feed.urls[feed.currentIndex],
            nextDeliveryDate: feed.nextDeliveryDate,
        });
    } catch (error) {
        console.error("Error fetching feed status:", error);
        res.status(500).send("Error fetching feed status");
    }
});

app.get("/feeds", async (req, res) => {
    try {
        const feeds = JSON.parse(await fs.readFile("feeds.json", "utf8"));
        const { search, sortBy } = req.query;

        let filteredFeeds = Object.values(feeds);

        if (search) {
            filteredFeeds = filteredFeeds.filter(
                (feed) =>
                    feed.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (sortBy) {
            filteredFeeds.sort((a, b) => {
                if (sortBy === "name") return a.name.localeCompare(b.name);
                if (sortBy === "date")
                    return (
                        new Date(b.nextDeliveryDate) -
                        new Date(a.nextDeliveryDate)
                    );
                return 0;
            });
        }

        res.json(filteredFeeds);
    } catch (error) {
        console.error("Error fetching feeds:", error);
        res.status(500).json({ error: "Error fetching feeds" });
    }
});

app.get("/feeds/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const feeds = JSON.parse(await fs.readFile("feeds.json", "utf8"));
        const feed = feeds[id];
        if (feed) {
            res.json(feed);
        } else {
            res.status(404).json({ error: "Feed not found" });
        }
    } catch (error) {
        console.error("Error fetching feed:", error);
        res.status(500).json({ error: "Error fetching feed" });
    }
});

app.put("/feed/:id", async (req, res) => {
    const { id } = req.params;
    const { name, urls, days, time, timezone, repeat } = req.body;
    try {
        const feeds = JSON.parse(await fs.readFile("feeds.json", "utf8"));
        if (feeds[id]) {
            feeds[id] = {
                ...feeds[id],
                name,
                urls: urls.map(url => ({ url, valid: isValidUrl(url) })),
                days: parseInt(days),
                time: time || "12:00 PM",
                timezone,
                repeat,
                nextDeliveryDate: getNextDeliveryDate(
                    days,
                    time,
                    timezone,
                    new Date(),
                ),
            };
            console.log("Updating feed:", JSON.stringify(feeds[id], null, 2));
            await fs.writeFile("feeds.json", JSON.stringify(feeds, null, 2));
            res.json({
                message: "Feed updated successfully",
                updatedFeed: feeds[id],
            });
        } else {
            res.status(404).json({ error: "Feed not found" });
        }
    } catch (error) {
        console.error("Error updating feed:", error);
        res.status(500).json({ error: "Error updating feed" });
    }
});

app.delete("/feed/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const feeds = JSON.parse(await fs.readFile("feeds.json", "utf8"));
        if (feeds[id]) {
            delete feeds[id];
            await fs.writeFile("feeds.json", JSON.stringify(feeds, null, 2));
            res.json({ message: "Feed deleted successfully" });
        } else {
            res.status(404).json({ error: "Feed not found" });
        }
    } catch (error) {
        console.error("Error deleting feed:", error);
        res.status(500).json({ error: "Error deleting feed" });
    }
});

app.get("/url-metadata", async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }
    try {
        const metadata = await getUrlMetadata(url);
        res.json(metadata);
    } catch (error) {
        console.error("Error fetching metadata:", error);
        res.status(500).json({ error: "Error fetching metadata" });
    }
});

app.get("/embed/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const feeds = JSON.parse(await fs.readFile("feeds.json", "utf8"));
        const feed = feeds[id];
        if (!feed) {
            return res.status(404).send("Feed not found");
        }

        // Fetch metadata for all URLs in the feed
        const urlsWithMetadata = await Promise.all(
            feed.urls.map(async (url) => {
                const metadata = await getUrlMetadata(url.url);
                return { url: url.url, metadata, valid: url.valid };
            }),
        );

        res.render("embed", {
            feed: {
                ...feed,
                url: `${req.protocol}://${req.get("host")}/feed/${id}`,
            },
            urlsWithMetadata,
        });
    } catch (error) {
        console.error("Error generating embed:", error);
        res.status(500).send("Error generating embed");
    }
});

app.post("/feeds/bulk-action", async (req, res) => {
    const { action, feedIds } = req.body;

    try {
        const feeds = JSON.parse(await fs.readFile("feeds.json", "utf8"));

        switch (action) {
            case "delete":
                feedIds.forEach((id) => delete feeds[id]);
                break;
            case "pause":
                feedIds.forEach((id) => {
                    if (feeds[id]) feeds[id].paused = true;
                });
                break;
            case "resume":
                feedIds.forEach((id) => {
                    if (feeds[id]) feeds[id].paused = false;
                });
                break;
            default:
                return res.status(400).json({ error: "Invalid action" });
        }

        await fs.writeFile("feeds.json", JSON.stringify(feeds, null, 2));
        res.json({ message: "Bulk action completed successfully" });
    } catch (error) {
        console.error("Error performing bulk action:", error);
        res.status(500).json({ error: "Error performing bulk action" });
    }
});

app.post("/cleanup-feeds", async (req, res) => {
    try {
        const feeds = JSON.parse(await fs.readFile("feeds.json", "utf8"));
        let cleanedCount = 0;

        for (const [id, feed] of Object.entries(feeds)) {
            const originalLength = feed.urls.length;
            feed.urls = feed.urls.filter(url => url && isValidUrl(url.url));
            if (feed.urls.length !== originalLength) {
                cleanedCount++;
                feed.currentIndex = feed.currentIndex % feed.urls.length;
            }
        }

        await fs.writeFile("feeds.json", JSON.stringify(feeds, null, 2));
        res.json({ message: `Cleaned up ${cleanedCount} feeds`, cleanedFeeds: feeds });
    } catch (error) {
        console.error("Error cleaning up feeds:", error);
        res.status(500).json({ error: "Error cleaning up feeds" });
    }
});

cron.schedule("* * * * *", async () => {
    try {
        const feeds = JSON.parse(await fs.readFile("feeds.json", "utf8"));
        const currentDate = new Date();

        for (const [id, feed] of Object.entries(feeds)) {
            if (currentDate >= new Date(feed.nextDeliveryDate)) {
                console.log(`Updating feed: ${id}`);
                console.log(`Current feed state:`, JSON.stringify(feed, null, 2));

                const validUrls = feed.urls.filter(url => url.valid);
                feed.currentIndex = (feed.currentIndex + 1) % validUrls.length;

                // If the feed has completed a cycle and repeat is false, don't update
                if (feed.currentIndex === 0 && !feed.repeat) {
                    console.log(`Feed ${id} completed cycle and repeat is false. Skipping update.`);
                    continue;
                }

                const currentUrl = validUrls[feed.currentIndex].url;
                console.log(`Current URL for feed ${id}: ${currentUrl}`);

                feed.nextDeliveryDate = getNextDeliveryDate(
                    feed.days,
                    feed.time || "12:00 PM",
                    feed.timezone,
                    currentDate
                );

                console.log(`Updated feed state:`, JSON.stringify(feed, null, 2));

                // Update the feed in the feeds object
                feeds[id] = feed;
            }
        }

        await fs.writeFile("feeds.json", JSON.stringify(feeds, null, 2));
        console.log("Feeds updated successfully");
    } catch (error) {
        console.error("Error updating feeds:", error);
    }
});

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port}`);
});
