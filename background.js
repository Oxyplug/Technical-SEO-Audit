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
      } catch (error) {
        reject(error);
      }
    });
  };

  /**
   * Init
   * @returns {Promise<void>}
   */
  static async setFileSizes() {
    let loadFails = {};
    let imageFilesizes = {};
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
            await Background.setLocalStorage({image_filesizes: imageFilesizes});
          } else {
            loadFails[details.url] = details.statusCode;
            await Background.setLocalStorage({load_fails: loadFails});
          }
        }
      },
      {urls: ["<all_urls>"], types: ['image']},
      ['responseHeaders']
    );
  };

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

        // Remove previous storage
        await Background.removeLocalStorage('image_filesizes');
        await Background.removeLocalStorage('load_fails');

        // Audit
        await Background.setFileSizes();

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