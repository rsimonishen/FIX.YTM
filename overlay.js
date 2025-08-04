console.log("FIXYT: Initializing overlay")
const body = document.body

const showOverlay = function() {
    overlayButton.style.display = "none"
    overlayMenu.style.display = "flex"
}
const hideOverlay = function() {
    overlayButton.style.display = "flex"
    overlayMenu.style.display = "none"
}

// Initializing Overlay Menu
const overlayButton = document.fixytm.createFunctionalItem("button", showOverlay, "fix-ytm-overlay-trigger")
overlayButton.innerHTML = "Fix"
body.appendChild(overlayButton)

const overlayMenu = document.fixytm.createFunctionalItem("div", null, "fix-ytm-overlay-menu", "flex-wrapper")
overlayMenu.id = "fix-ytm-overlay-menu"
body.appendChild(overlayMenu)

const overlayInnerWrapper = document.fixytm.createFunctionalItem("div", null, "fix-ytm-overlay-inner-wrapper", "flex-wrapper")
overlayMenu.appendChild(overlayInnerWrapper)

const hideOverlayButton = document.fixytm.createFunctionalItem("button", hideOverlay, "fix-ytm-overlay-hide", '')
hideOverlayButton.innerHTML = "<hr />"
hideOverlayButton.id = "fix-ytm-overlay-hide"
overlayMenu.appendChild(hideOverlayButton)

// Initializing the mode switch menu
const renderModeButton = document.createElement("button")
renderModeButton.innerHTML = "Render controls"
renderModeButton.id = "fix-ytm-overlay-mode-render-button"
renderModeButton.title = "Press to change mode"
overlayMenu.appendChild(renderModeButton)

const modeMenuOptions = { // mode menu options are parts of a list presented as an object for simple plug-and-play modification and extension of the functionality
    playlist: {
        areaOfAction: '/playlist',
        function: function() {
            if (!window.fixytm.cachedPlaylist.isCached || window.fixytm.cachedPlaylist.id !== fetchPlaylistId()) {
                let fetchPlaylistButton = document.fixytm.createFunctionalItem(
                    "button",
                    groupPlaylist,
                )
                fetchPlaylistButton.innerHTML = "Fetch"
                fetchPlaylistButton.title = "Press to fetch playlist"
                overlayInnerWrapper.appendChild(fetchPlaylistButton)
            } else {
                let sortByLikesButton = document.fixytm.createFunctionalItem(
                    "button",
                    sortPlaylist('likeCount', true)
                )
                sortByLikesButton.innerHTML = "Sort by likes"
                sortByLikesButton.title = "Press to sort playlist by likes"
                overlayInnerWrapper.appendChild(sortByLikesButton)
                let sortByViewsButton = document.fixytm.createFunctionalItem(
                    "button",
                    sortPlaylist('viewCount')
                )
                sortByViewsButton.innerHTML = "Sort by views"
                sortByViewsButton.title = "Press to sort playlist by views"
                overlayInnerWrapper.appendChild(sortByViewsButton)
                let sortByDateButton = document.fixytm.createFunctionalItem(
                    "button",
                    sortPlaylist('publishedAt', true)
                )
                sortByDateButton.innerHTML = "Sort by date"
                sortByDateButton.title = "Press to sort playlist by date"
                overlayInnerWrapper.appendChild(sortByDateButton)
                let sortByDurationButton = document.fixytm.createFunctionalItem(
                    "button",
                    sortPlaylist('duration')
                )
                sortByDurationButton.innerHTML = "Sort by duration"
                sortByDurationButton.title = "Press to sort playlist by duration"
                overlayInnerWrapper.appendChild(sortByDurationButton)
            }
        },
    },
    default: {
        areaOfAction: '/',
        tag: 'p',
        warningText: 'The extension has no functionality for this area of the website yet.',
        id: 'fix-ytm-overlay-warning',
        function: function() {
            let warning = document.fixytm.createFunctionalItem(this.tag)
            warning.innerHTML = this.warningText
            overlayInnerWrapper.appendChild(warning)
            throw new Error("No mode found for this area of the website")
        }
    }
    // More coming soon
}

const renderMode = function() {
    if (!window.fixytm.user.USER_COUNTRY) try {
        window.fixytm.user.USER_COUNTRY = fetchCountry(true)
    } catch(err) {console.error(err)}
    for (let i in modeMenuOptions) {
        if (window.location.pathname === modeMenuOptions[i].areaOfAction) {
            overlayInnerWrapper.fixytmDeleteFunctionalItems()
            modeMenuOptions[i].function()
            return 0
        }
    }
    modeMenuOptions.default.function()
}

renderModeButton.onclick = renderMode

overlayButton.onclick = showOverlay
hideOverlayButton.onclick = hideOverlay
