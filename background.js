class Background {
  /**
   * Remove from local storage
   * @param keys
   * @returns {Promise<unknown>}
   */
  static async removeLocalStorage(keys) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.remove(keys, () => {
          resolve();
        });
      } catch (ex) {
        reject(ex);
      }
    });
  };

  /**
   * Init
   * @returns {Promise<void>}
   */
  static async audit() {
    let loadFails = {};
    let imageFilesizes = {};

    // TODO: Remove!
    // chrome.webNavigation.onBeforeNavigate.addListener(() => {
      chrome.webRequest.onHeadersReceived.addListener(async (details) => {
        if (details.tabId !== Background.currentTab.id) {
          if (details.statusCode === 200) {
            let filesize = 0;

            details.responseHeaders.forEach((item) => {
              if (item.name.toLowerCase() === 'content-length') {
                filesize = Number(item.value) / 1000;
              }
            });

            imageFilesizes[details.url] = filesize;
            await chrome.storage.local.set({oxyplug_image_filesizes: imageFilesizes});
          } else {
            loadFails[details.url] = details.statusCode;
            await chrome.storage.local.set({oxyplug_load_fails: loadFails});
          }
        }
      },
      {urls: ["<all_urls>"], types: ['image']},
      ['responseHeaders']
      );
    // });
  };

  /**
   * Get current tab
   * @returns {Promise<chrome.tabs.Tab>}
   */
  static async getCurrentTab() {
    const queryOptions = {active: true, currentWindow: true};
    const [tab] = await chrome.tabs.query(queryOptions);
    return tab;
  }

  /**
   * @returns {Promise<void>}
   */
  static async init() {
    // Get current tab
    Background.currentTab = await Background.getCurrentTab();

    // Remove previous storage
    await Background.removeLocalStorage('oxyplug_image_filesizes');
    await Background.removeLocalStorage('oxyplug_load_fails');

    // Audit
    await Background.audit();
  };
}

Background.init().then(() => {
});
