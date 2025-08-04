// Overlay utils
document.fixytm.createFunctionalItem = (tag = "button", handler = null, id, className = "fix-ytm-functionality-item") => { // create a fixytm functionality element and mark it to make it easy to remove automatically later
    let element = document.createElement(tag)
    element.onclick = handler
    className && (element.className = className)
    id && (element.id = id)
    return element
}
HTMLElement.prototype.fixytmDeleteFunctionalItems = function(className = "fix-ytm-functionality-item") { // clean up an element from child elements created by fixytm
    let targets = [...this.getElementsByClassName(className)]
    for (let i = 0; i < targets.length; i++) targets[i].remove()
}

// Playlist utils
async function fetchLocalPlaylistItemsStatic(expectedItemsCount) { // fetch a static array of items of the viewed playlist
    if (window.location.pathname !== "/playlist") throw new Error("You are not on a playlist page");
    await renderPlaylist(expectedItemsCount);
    return document.querySelectorAll("ytmusic-responsive-list-item-renderer.ytmusic-playlist-shelf-renderer");
}
function createItemsMap(keysArray, itemsArray) { // assigns each video in an array to a specific key (reminder: always keep the original keys: their copies won't work because Map objects recognize keys by their links, not their content; optimized to use video.statistics elements as keys
    if (keysArray.length !== itemsArray.length) throw new Error("keysArray and itemsArray must have the same length");
    let map = new Map();
    for (let i in keysArray) map.set(keysArray[i], itemsArray[i]);
    return map;
}
function fetchPlaylistId() { // fetch playlistId of the playlist currently viewed by the user
    let id = window.location.search.split("=")[1];
    console.log("FIXYT: Fetching playlist id: " + id);
    return id;
}
async function renderPlaylist(expectedItemsCount) { // push-render all DOM items in long playlists before mapping or realigning them
    let rendertgt = document.querySelector("div#contents.style-scope.ytmusic-playlist-shelf-renderer")
    let cycle = 0;
    while (rendertgt.childNodes.length < expectedItemsCount && cycle++ < window.fixytm.MAX_CYCLES_PER_RENDER) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(100);
    }
    window.scrollTo(0, 0)
}

sleep = ms => new Promise(resolve => setTimeout(resolve, ms));