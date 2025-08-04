async function groupPlaylist() {
    overlayInnerWrapper.fixytmDeleteFunctionalItems();
    let videoIds = [];
    let videoStats = [];
    await fetchPlaylistItemIds(fetchPlaylistId()).then(output => {
        videoIds = output;
        console.log(`Fetched item ids: ${videoIds.join(', ')}`);
        return videoIds;
    }).then(videoIds => {
        return fetchVideosStats(videoIds).then(output => {
            videoStats = output;
        })
    }).then(() => {
        // let map = createItemsMap(videoStats, document.querySelectorAll("ytmusic-responsive-list-item-renderer.ytmusic-playlist-shelf-renderer"));
        window.fixytm.cachedPlaylist.keys = videoStats;
        window.fixytm.cachedPlaylist.size = videoStats.length;
        window.fixytm.cachedPlaylist.isCached = true;
        console.log(`Groupped ${videoStats.length} items`);
        renderMode();
    }).catch(err => {
        console.error(err);
        return null;
    })
}

function sortPlaylist(
    criteria,
    autorearrange = true,
    keys = window.fixytm.cachedPlaylist.currentOrder || window.fixytm.cachedPlaylist.keys) {
    if (!keys) throw new Error("You must group the playlist before trying to sort it");
    else if (typeof criteria !== "string") throw new TypeError("criteria must be a string");
    return async function() {
        let target = undefined;
        let targetParser = undefined;
        switch (criteria) {
            case 'likeCount': target = 'statistics'; targetParser = Number; break;
            case 'viewCount': target = 'statistics'; targetParser = Number; break;
            case 'publishedAt': target = 'snippet'; targetParser = parseDate; break;
            case 'duration': target = 'contentDetails'; targetParser = parseDuration; break;
        }
        if (!target) throw new Error("Invalid criteria");
        let mapping = await mapCachedPlaylist();
        let map = mapping.map;
        let order = new Array(map.size);
        for (let i = 0; i < order.length; i++) {
            let max = -Infinity;
            let lead = undefined;
            for (let j = 0; j < order.length; j++) {
                if (targetParser(keys[j][target][criteria]) >= max && !order.includes(keys[j])) {
                    lead = j;
                    max = targetParser(keys[j][target][criteria]);
                }
            }
            if (typeof lead === 'number') order[i] = keys[lead]; else throw new Error("Something went wrong while sorting the playlist");
            // wrapper.appendChild(map.get(order[i]))
        }
        // window.fixytm.cachedPlaylist.currentOrder = order;
        if (autorearrange) arrangePlaylistItems(order);
        else return order;
        // order is rearranged container for keys: keys are still represented by statistic pieces
        // it is implemented to simplify rearrangement by using elements of order as keys to DOM
    }
}

function arrangePlaylistItems(
    order,
    map = window.fixytm.cachedPlaylist.map,
    wrapper = document.querySelector("div#contents.ytmusic-playlist-shelf-renderer")) {
    if (!map) throw new Error("You must map the playlist before trying to arrange it");
    for (let item of order) {
        wrapper.appendChild(map.get(item))
    }
    window.fixytm.cachedPlaylist.currentOrder = order;
    return order;
}

async function fetchCountry(rerender = false) {
    let countryCode = '';
    await new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", `https://ipinfo.io/json?token=${window.fixytm.apiKeys.IPINFO_API_KEY}`);
        xhr.onload = () => {
            let response = JSON.parse(xhr.responseText);
            if (xhr.status !== 200 || !response.country) resolve(new Error('XMLHttpRequest reached its destination but failed to return user\'s country code'));
            countryCode = response.country;
            window.fixytm.user.USER_COUNTRY = countryCode;
            console.log(`Country detected: ${countryCode}`);
            resolve();
        }
        xhr.onerror = () => {
            console.error(`Request failed: ${xhr.status}`);
            reject(new Error('XMLHttpRequest failed; see message above for details'));
        }
        xhr.send();
    })
    rerender && (renderMode());
    return countryCode;
}

async function fetchPlaylistItemIds(playlistId) { // fetch videoId for each item of the playlist
    if (typeof playlistId !== "string") throw new TypeError("playlistId must be a string");
    let outputArray = [];
    let XHRs = [];
    let items = [];
    let cycle = 0;
    let nextPageToken = "";
    let undone = true;
    while (undone && cycle < window.fixytm.MAX_CYCLES_PER_FETCH) {
        await new Promise((resolve, reject) => {
            let maxPageItems = window.fixytm.MAX_PLAYLIST_PAGE_ITEMS;
            XHRs[cycle] = new XMLHttpRequest();
            XHRs[cycle].open("GET", `https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=${maxPageItems}&playlistId=${playlistId}&pageToken=${nextPageToken}&key=${window.fixytm.apiKeys.GOOGLE_API_KEY}`);
            XHRs[cycle].onload = () => {
                let response = JSON.parse(XHRs[cycle].responseText)
                for (let item of response.items) items.push(item);
                console.log(`Request ${cycle} fetched ${response.items.length} items successfully`);
                console.log(`Status: ${XHRs[cycle].status}`);
                if (response.nextPageToken) {nextPageToken = response.nextPageToken; cycle++} else undone = false;
                resolve();
            }
            XHRs[cycle].onerror = () => {
                console.error(`Request ${cycle} failed: ${XHRs[cycle].status}`);
                reject(new Error('XMLHttpRequest failed; see message above for details'));
            }
            XHRs[cycle].send();
        })
    }
    for (let i in items) outputArray[i] = items[i].contentDetails.videoId;
    window.fixytm.cachedPlaylist.id = playlistId;
    window.fixytm.cachedPlaylist.itemIds = outputArray;
    return outputArray;
}

async function fetchVideosStats(videoIds) { // fetch statistics and content details for each video id listed
    if (typeof videoIds !== "object") throw new TypeError("videoId must be an array");
    let outputArray = [];
    let XHRs = [];
    let items = [];
    let cycle = 0;
    let maxPageItems = window.fixytm.MAX_VIDEOS_PAGE_ITEMS;
    let layout = `https://youtube.googleapis.com/youtube/v3/videos?part=statistics%2CcontentDetails%2Csnippet&maxResults=${maxPageItems}&key=${window.fixytm.apiKeys.GOOGLE_API_KEY}&id=`;
    let requests = []
    let undone = true;
    while (undone && cycle < window.fixytm.MAX_CYCLES_PER_FETCH) {
        await new Promise((resolve, reject) => {
            requests[cycle] = layout
            for (let i = 0; i < maxPageItems; i++) if (videoIds[i + (cycle * maxPageItems)]) requests[cycle] += `${videoIds[i + (cycle * maxPageItems)]}%2C`; else {undone = false; break}
            XHRs[cycle] = new XMLHttpRequest();
            XHRs[cycle].open("GET", requests[cycle].slice(0, -3))
            XHRs[cycle].onload = () => {
                let response = JSON.parse(XHRs[cycle].responseText)
                for (let i in response.items) items.push(response.items[i]);
                console.log(`Request ${cycle} fetched ${response.items.length} items successfully`);
                console.log(`Status: ${XHRs[cycle].status}`);
                cycle++;
                resolve();
            }
            XHRs[cycle].onerror = () => {
                console.error(`Request ${cycle} failed: ${XHRs[cycle].status}`);
                undone = false;
                reject(new Error('XMLHttpRequest failed; see message above for details'));
            }
            requests[cycle] === layout ? resolve() : XHRs[cycle].send();
        })
    }
    for (let item of items) {
        // ghost DOM audit; required because YouTube Data API returns playlists with all the songs even if some of them are blocked and don't display on the page
        let details = item.contentDetails
        if (details.regionRestriction) {
            let restrictions = details.regionRestriction;
            if (restrictions.allowed) {
                if (restrictions.allowed.includes(window.fixytm.user.USER_COUNTRY)) outputArray.push({statistics: item.statistics, snippet: item.snippet, contentDetails: item.contentDetails});
                else console.error(`Found a blocked item: ${item.snippet.title}, allowed countries: ${restrictions.allowed.join(', ')}`)
            } else if (restrictions.blocked) {
                if (!restrictions.blocked.includes(window.fixytm.user.USER_COUNTRY)) outputArray.push({statistics: item.statistics, snippet: item.snippet, contentDetails: item.contentDetails});
                else console.error(`Found a blocked item: ${item.snippet.title}, blocked countries: ${restrictions.blocked.join(', ')}`);
            } else outputArray.push({statistics: item.statistics, snippet: item.snippet, contentDetails: item.contentDetails});
        } else outputArray.push({statistics: item.statistics, snippet: item.snippet, contentDetails: item.contentDetails});
    }
    window.fixytm.cachedPlaylist.keys = outputArray;
    return outputArray;
}

async function mapCachedPlaylist(
    keys = window.fixytm.cachedPlaylist.currentOrder || window.fixytm.cachedPlaylist.keys ) {
    if (!keys) throw new Error("You must group the playlist before mapping it");
    let items = await fetchLocalPlaylistItemsStatic(keys.length);
    let map = new Map();
    if (keys.length === items.length) map = createItemsMap(keys, items);
    else throw new Error("Keychain doesn't match map size");
    console.log(`Mapped ${keys.length} items`);
    window.fixytm.cachedPlaylist.map = map;
    return {map: map, keys: keys};
}

function parseDate(date) {
    let output = new Date(date);
    return Number(output);
}

function parseDuration(duration) {
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = regex.exec(duration);
    const hours = matches[1] ? parseInt(matches[1], 10) : 0;
    const minutes = matches[2] ? parseInt(matches[2], 10) : 0;
    const seconds = matches[3] ? parseInt(matches[3], 10) : 0;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
}