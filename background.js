class Background {
  /**
   * @param details
   * @returns {Promise<void>}
   */
  static async setFileSizes(details) {
    let loadFails = {};
    let imageFilesizes = {};
    Background.currentTab = await Background.getCurrentTab();

    if (!Background.currentTab) {
      setTimeout(() => {
        Background.setFileSizes(details);
      }, 1000);
    } else if (details.tabId !== Background.currentTab.id) {
      // Image loaded
      if (details.statusCode === 200) {
        // Unset it if it was previously failed to load
        if (loadFails[details.url]) {
          delete loadFails[details.url];
          await Background.setLocalStorage({load_fails: loadFails});
        }

        // Do not add filesize if it has already been added
        if (!imageFilesizes[details.url]) {
          let filesize = 0;

          details.responseHeaders.forEach((item) => {
            if (item.name.toLowerCase() === 'content-length') {
              filesize = Number(item.value) / 1000;
            }
          });

          // add filesize
          imageFilesizes[details.url] = filesize;
          await Background.setLocalStorage({image_filesizes: imageFilesizes});
        }
      } else {
        if (imageFilesizes[details.url]) {
          delete imageFilesizes[details.url];
          await Background.setLocalStorage({image_filesizes: imageFilesizes});
        }

        loadFails[details.url] = details.statusCode;
        await Background.setLocalStorage({load_fails: loadFails});
      }
    }
  }

  /**
   * Get current tab
   * @returns {Promise<unknown>}
   */
  static async getCurrentTab() {
    return new Promise(async (resolve, reject) => {
      try {
        const queryOptions = {active: true, currentWindow: true};
        const [tab] = await chrome.tabs.query(queryOptions);

        resolve(tab);
      } catch (error) {
        console.log(error);
        reject(false);
      }
    })
      .then(response => {
        return response;
      })
      .catch(response => {
        return response;
      });
  }

  /**
   * Set local storage
   * @param object
   * @returns {Promise<unknown>}
   */
  static async setLocalStorage(object) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(object, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    })
      .then(() => {
        return true;
      })
      .catch(() => {
        return false
      });
  };

  /**
   * @returns {Promise<void>}
   */
  static async init() {
    return new Promise(async (resolve, reject) => {
      try {
        // Get current tab
        Background.currentTab = await Background.getCurrentTab();

        // Audit
        chrome.webRequest.onHeadersReceived.addListener(async (details) => {
            setTimeout(() => {
              Background.setFileSizes(details);
            }, 1000);
          },
          {urls: ["<all_urls>"], types: ['image']},
          ['responseHeaders']
        );

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  };
}

Background.init()
  .then(() => {
    console.log('Background init');
  })
  .catch(() => {
    console.log('Background error')
  });