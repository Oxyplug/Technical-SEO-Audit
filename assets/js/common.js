class Common {
  static hostLearnMores = [];
  static learnMores;

  /**
   * Make modal actions
   * @param modalId
   * @param openId
   * @returns {Promise<void>}
   */
  static async makeModalActions(modalId, openId = null) {
    const section = await Common.getElement('#oxyplug-tech-seo-section');
    if (section) {
      const modal = section.shadowRoot.getElementById(modalId);

      // Show
      if (openId) {
        const openButton = section.shadowRoot.getElementById(openId);
        if (openButton) {
          openButton.onclick = () => {
            modal.style.display = 'block';
          }
        }
      }

      // Hide
      const closeButtons = section.shadowRoot.querySelectorAll(`#${modalId} .oxyplug-modal-close`);
      // Hide when click on button
      closeButtons.forEach((closeButton) => {
        closeButton.onclick = () => {
          modal.style.display = 'none';
        }
      });

      // Hide when click out of modal
      const parent = section.shadowRoot.getElementById('oxyplug-modal-message');
      parent.addEventListener('click', (event) => {
        if (event.target === parent) {
          modal.style.display = 'none';
        }
      });
    }
  }

  /**
   * Show modal
   * @param modal
   * @returns {Promise<void>}
   */
  static async showModal(modal) {
    modal.style.display = 'block';
  }

  /**
   * Show issues
   * @param messages
   * @param issueTypes
   * @param caller
   * @returns {Promise<void>}
   */
  static async showIssues(messages, issueTypes, caller = 'content') {
    const messageId = 'oxyplug-modal-message';
    const sectionId = 'oxyplug-tech-seo-section';
    let shadowWrap = await Common.getElement(`#${sectionId}`);

    if (!shadowWrap) {
      shadowWrap = document.createElement('div');
      shadowWrap.id = sectionId;
      document.body.appendChild(shadowWrap);
      const shadowRoot = shadowWrap.attachShadow({mode: 'open'});
      const stylePathCommon = chrome.runtime.getURL('assets/css/common.css');
      const styleName = caller === 'content' ? 'shadow-content' : 'popup';
      let extraStyle = chrome.runtime.getURL(`assets/css/${styleName}.css`);
      extraStyle = `<link rel="stylesheet" type="text/css" href="${extraStyle}">`;

      shadowRoot.innerHTML =
        `<link rel="stylesheet" type="text/css" href="${stylePathCommon}">
        ${extraStyle}
        <div id="${messageId}" class="oxyplug-modal">
          <div class="oxyplug-modal-content">
            <span class="oxyplug-modal-close">&times;</span>
            <h1 class="oxyplug-tech-seo-h1">Audit Report</h1>
            <ul></ul>
          </div>
        </div>`;

      // Make modal actions
      await Common.makeModalActions(messageId);
    }

    const messageModal = shadowWrap.shadowRoot.getElementById(messageId);
    const ul = messageModal.querySelector('.oxyplug-modal-content ul');
    ul.innerHTML = '';
    for (const message of messages) {
      const index = messages.indexOf(message);
      const li = document.createElement('li');
      const span = document.createElement('span');
      if (issueTypes === 'info') {
        span.classList.add(issueTypes);
        span.innerText = 'i';
      } else {
        span.classList.add('issue-number');
        if (Array.isArray(issueTypes) && issueTypes.length) {
          const id = issueTypes[index];

          // Change the color based on criticality
          if (['nextGenFormatsIssue', 'lazyLoadIssue', 'preloadLcpIssue'].includes(id)) {
            span.classList.add('warning');
          } else if (['lcpIssue', 'decodingIssue'].includes(id)) {
            span.classList.add('info');
          }

          // Highlight the filtered one
          let filter = document.querySelector('#oxyplug-issue-list > .oxyplug-tabs > button.active');
          if (filter) {
            const filterId = filter.id.replace(/-([a-z])/g, (match, letter) => {
              return letter.toUpperCase();
            });

            if (id === filterId) {
              li.classList.add('filtered');
            }
          }

          // Add learn more and append
          const host = typeof (Popup) !== 'undefined' ? Popup.currentHost : location.host;
          await Common.setLearnMores(host);
          let utmLink = Common.learnMores['utm-link'];
          const [[firstKey]] = Object.entries(Common.learnMores['issues'][id]);
          const href = `${utmLink}${firstKey}#${firstKey}`;
          const learnMore = `<a class="oxyplug-icon-info" href="${href}" target="_blank"></a>`;
          li.append(span, message);
          li.insertAdjacentHTML('beforeend', learnMore);
          ul.append(li);
        }
        span.innerText = index + 1;
      }
    }

    await Common.showModal(messageModal);
  }

  /**
   * Get local storage
   * @param key
   * @returns {Promise<unknown>}
   */
  static async getLocalStorage(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, resolve);
    })
      .then(response => {
        return response[key];
      })
      .catch(() => {
        return null
      });
  };

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
   * Get element
   * @param query
   * @returns {Promise<unknown>}
   */
  static async getElement(query) {
    return new Promise(async (resolve, reject) => {
      try {
        const element = await document.querySelector(query);
        resolve(element);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    })
      .then((response) => {
        return response;
      });
  };

  /**
   * Get elements
   * @param query
   * @returns {Promise<unknown>}
   */
  static async getElements(query) {
    return new Promise(async (resolve, reject) => {
      try {
        const elements = await document.querySelectorAll(query);
        resolve(elements);
      } catch (error) {
        console.log(error);
        reject(error)
      }
    });
  };

  /**
   * Get current tab
   * @returns {Promise<chrome.tabs.Tab>}
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
   * Add logs
   * @param text
   * @param currentHost
   * @returns {Promise<void>}
   */
  static async log(text, currentHost = location.host) {
    return new Promise(async (resolve, reject) => {
      try {

        const addLog = (logs, text) => {
          // Add to localStorage
          Common.setLocalStorage({logs});

          // Send the log to popup
          Common.port = chrome.runtime.connect({name: 'oxyplug-tech-seo-audit'});
          Common.port.postMessage({log: text});
        }

        let logs = await Common.getLocalStorage('logs');
        if (!logs || Object.keys(logs).length === 0) {
          logs = {[currentHost]: [text]};
          await addLog(logs, text);
        } else if (!logs[currentHost]) {
          logs[currentHost] = [text];
          await addLog(logs, text);
        } else if (!logs[currentHost].includes(text)) {
          logs[currentHost].push(text);
          await addLog(logs, text);
        }

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Make a delay in milliseconds
   * @param milliseconds
   * @returns {Promise<unknown>}
   */
  static async wait(milliseconds) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, milliseconds);
    });
  }

  /**
   * Get learn mores
   * @returns {Promise<unknown>}
   */
  static async setLearnMores(host) {
    return new Promise(resolve => {
      if (!Common.hostLearnMores || !Common.hostLearnMores[host]) {
        const utmLink = `https://www.oxyplug.com/docs/oxy-seo-audit/audit-definitions/?utm_source=${host}&utm_medium=chrome-extension&utm_campaign=`;
        Common.learnMores = Common.hostLearnMores[host] = {
          'utm-link': utmLink,
          'issues': {
            'loadFailsIssue': {
              'load-fails': "The image fails to load with http status code of X.",
            },
            'srcIssue': {
              'src': "Without src attribute.",
            },
            'altIssue': {
              'alt': "Without alt attribute.",
              'alt-length': "The alt attribute length is more than X characters.",
            },
            'widthIssue': {
              'width': "Without width attribute.",
            },
            'heightIssue': {
              'height': "Without height attribute.",
            },
            'renderedSizeIssue': {
              'rendered-size': "The rendered image dimensions don't equal the original image dimensions.",
            },
            'aspectRatioIssue': {
              'aspect-ratio': "The aspect-ratio of the rendered image doesn't equal the aspect-ratio of the original image.",
            },
            'filesizeIssue': {
              'filesize': "The image filesize is bigger than X KB.",
            },
            'nxIssue': {
              'nx': "No 2x image found for DPR 2 devices.",
            },
            'nextGenFormatsIssue': {
              'next-gen-formats': "The next-gen (WebP, AVIF) is not provided.",
            },
            'lazyLoadIssue': {
              'lazy-load': "The loading attribute doesn't equal `lazy`.",
              'eager-load': "The loading attribute of LCP image doesn't equal `eager`.",
            },
            'preloadLcpIssue': {
              'lcp-preload': "The LCP (Image) is not preloaded with link tag.",
            },
            'lcpIssue': {
              'lcp': "The LCP shows the largest image above the fold.",
            },
            'decodingIssue': {
              'decoding': "Having `decoding=\"sync\"` for LCP image is recommended.",
            },
          }
        };
      }
      resolve();
    })
      .catch(error => {
        console.log(error);
        return error;
      });
  }
}