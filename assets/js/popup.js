class Popup {
  /**
   * Init
   * @returns {Promise<void>}
   */
  static start = document.getElementById('start');
  static issues = {};

  static async init() {
    // Get current tab
    Popup.currentTab = await Popup.getCurrentTab();

    // Max image filesize
    let maxImageFilesize = Number(await getLocalStorage('oxyplug_max_image_filesize'));
    maxImageFilesize = isNaN(maxImageFilesize) ? 150 : maxImageFilesize;
    const maxImageFilesizeEl = document.getElementById('oxyplug-max-image-filesize');
    await chrome.storage.local.set({oxyplug_max_image_filesize: maxImageFilesize});
    maxImageFilesizeEl.value = maxImageFilesize;
    maxImageFilesizeEl.addEventListener('input', (el) => {
      let value = Number(Math.abs(el.target.value));
      value = isNaN(value) || value < 1 ? 1 : value;
      chrome.storage.local.set({oxyplug_max_image_filesize: value});
    });

    // Max image alt
    let maxImageAlt = Number(await getLocalStorage('oxyplug_max_image_alt'));
    maxImageAlt = isNaN(maxImageAlt) ? 150 : maxImageAlt;
    const maxImageAltEl = document.getElementById('oxyplug-max-image-alt');
    await chrome.storage.local.set({oxyplug_max_image_alt: maxImageAlt});
    maxImageAltEl.value = maxImageAlt;
    maxImageAltEl.addEventListener('input', (el) => {
      let value = Number(Math.abs(el.target.value));
      value = isNaN(value) || value < 1 ? 1 : value;
      chrome.storage.local.set({oxyplug_max_image_alt: value});
    });

    // X Color
    const xColor = await getLocalStorage('oxyplug_x_color');
    const XColorEl = document.getElementById('oxyplug-x-color');
    XColorEl.value = xColor ?? '#ff0000';
    XColorEl.addEventListener('change', (el) => {
      const isColor = /^#[\dA-F]{6}$/i.test(el.target.value);
      const xColor = isColor ? el.target.value : '#ff0000';
      chrome.storage.local.set({oxyplug_x_color: xColor});

      chrome.tabs.sendMessage(Popup.currentTab.id, {newXColor: xColor}, () => {
        if (!chrome.runtime.lastError) {
          console.log('fine');
        } else {
          console.log(chrome.runtime.lastError);
        }
      });
    });

    // Load issues on the page (From Storage)
    Popup.issues = await getLocalStorage('oxyplug_tech_seo_issues');
    const currentHost = await Popup.getCurrentHost();
    if (Popup.issues && Popup.issues[currentHost]) {
      await Popup.loadList(Popup.issues[currentHost]);
      const activeLi = document.querySelector('#oxyplug-issue-list ul li.active');
      if (activeLi) {
        activeLi.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }

    // Get exclusions for exclusions tab
    const p = document.createElement('p');
    p.innerText = 'No exclusions!';

    const exclusions = await getLocalStorage('oxyplug_tech_seo_exclusions');
    if (exclusions && exclusions[currentHost] && exclusions[currentHost].length) {
      exclusions[currentHost].forEach((exclusion, index) => {
        const li = document.createElement('li');
        li.innerText = exclusion;
        li.onclick = async () => {
          exclusions[currentHost].splice(index, 1);
          await chrome.storage.local.set({oxyplug_tech_seo_exclusions: exclusions});
          li.remove();

          if (!document.querySelector('#exclusions ul li')) {
            document.querySelector('#exclusions').append(p);
          }
        };
        document.querySelector('#exclusions ul').append(li);
      });
    } else {
      document.querySelector('#exclusions').append(p);
    }

    // Start Analyzing
    // Popup.start = document.getElementById('start');
    this.start.addEventListener('click', (e) => {
      Popup.toggleSpinner('block');
      Popup.toggleList('none');
      e.target.disabled = true;
      setTimeout(() => {
        chrome.tabs.sendMessage(Popup.currentTab.id, {oxyplugStart: true}, () => {
          if (!chrome.runtime.lastError) {
            console.log('fine');
          } else {
            console.log(chrome.runtime.lastError);
          }
        });
      }, 500);
    });

    // Find issues on the page
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.oxyplugTechSeoIssues) {
        (async () => {
          await Popup.loadList(request.oxyplugTechSeoIssues);
          await Popup.start2Restart();
          await Popup.highlightActiveUrl();
          await Popup.highlightActiveFilter();
        })();
      } else if (request.showIssues) {
        (async () => await Common.showIssues(request.showIssues, request.issueTypes))();
      }

      sendResponse({status: true});
      return true;
    });

    // Change `start` to `restart` after the first execution
    if (Popup.issues && Popup.issues[currentHost]) {
      await Popup.start2Restart();
    }

    // Navigation between the pages
    const navButtons = document.querySelectorAll('nav button');
    navButtons.forEach((navButton) => {
      navButton.addEventListener('click', (el) => {

        // Highlight the active button
        const buttons = navButton.parentElement.querySelectorAll('button');
        buttons.forEach((button) => {
          button.classList.remove('button-active');
        });
        el.target.classList.add('button-active');

        // Change page/content
        const sectionId = navButton.dataset.target;
        const content = document.getElementById('content');
        const pages = content.querySelectorAll(':scope > div');
        pages.forEach((page) => {
          if (page.id === sectionId) {
            page.style.display = 'block';
          } else {
            page.style.display = 'none';
          }
        });

      }, false);
    });

    // Filters
    const filters = document.querySelector('.oxyplug-tabs');
    const filterButtons = filters.querySelectorAll(':scope > button');
    filterButtons.forEach((filterButton) => {
      filterButton.addEventListener('click', (el) => {
        el = el.currentTarget;

        // Change active button color
        const activeButtons = filters.querySelectorAll(':scope > button.active');
        activeButtons.forEach((activeButton) => {
          activeButton.classList.remove('active');
        });
        el.classList.add('active');

        // Store to highlight when popup pops up
        chrome.storage.local.set({oxyplug_active_filter: el.id});

        // Filter the list
        const filterTarget = 'data-' + el.id;
        const oxyplugIssueListUlLi = document.querySelectorAll('#oxyplug-issue-list ul li');
        if (filterTarget === 'data-all-issue') {
          oxyplugIssueListUlLi.forEach((li) => {
            li.style.display = 'block';
          });
        } else {
          oxyplugIssueListUlLi.forEach((li) => {
            li.style.display = li.hasAttribute(filterTarget) ? 'block' : 'none';
          });
        }

      });
    });

    // Modal
    await Common.makeModalActions('oxyplug-modal-message');
  }

  /**
   *
   * @param text
   * @param length
   * @param putAfter
   * @returns {Promise<string|*>}
   */
  static async oxyplugExcerpt(text, length = 50, putAfter = '...') {
    if (text.length > length) {
      return text.substring(0, length) + putAfter;
    }

    return text;
  };

  /**
   * Highlight active url
   * @returns {Promise<void>}
   */
  static async highlightActiveUrl() {
    const activeUrl = await getLocalStorage('oxyplug_active_url');
    if (activeUrl) {
      const li = document.querySelector('#oxyplug-issue-list ul li[data-target="' + activeUrl + '"]');
      if (li) {
        li.classList.add('active');
      }
    }
  };

  /**
   * Highlight active filter
   * @returns {Promise<void>}
   */
  static async highlightActiveFilter() {
    const activeFilter = await getLocalStorage('oxyplug_active_filter');
    if (activeFilter) {
      const li = document.querySelector('#oxyplug-issue-list #' + activeFilter);
      if (li) {
        li.classList.add('active');
      }
    }
  };

  /**
   * Load the list of issues
   * @param issues
   * @returns {Promise<void>}
   */
  static async loadList(issues) {
    const issuesCount = issues.count;
    issues = issues.issues;
    const issuesArray = Object.keys(issues);

    if (issuesArray.length) {
      // Sort
      issues = issuesArray.sort().reduce((obj, key) => {
        obj[key] = issues[key];
        return obj;
      }, {});

      // Empty the list of issues
      const oxyplugIssueListUl = document.querySelector('#oxyplug-issue-list ul');
      oxyplugIssueListUl.innerHTML = '';

      // Make the list of issues
      for (const [className, details] of Object.entries(issues)) {
        const liExists = oxyplugIssueListUl.querySelector(`[data-target="${className}"]`);
        let completeSrc = details.url;
        const srcExcerpt = await Popup.oxyplugExcerpt(completeSrc, 256);
        let li;
        if (liExists) {
          li = liExists;
          for (const [dataset] of Object.entries(li.dataset)) {
            if (dataset.slice(-5).toLowerCase() == 'issue') {
              delete li.dataset[dataset];
            }
          }
        } else {
          li = document.createElement('li');
          li.classList.add('button');
          li.dataset.target = className;
        }

        details.issueTypes.forEach((issueType) => {
          li.dataset[issueType] = 1;
        });
        li.innerText = srcExcerpt;
        li.title = srcExcerpt;
        li.onclick = (el) => {
          const liActive = oxyplugIssueListUl.querySelector('li.active');
          if (liActive) {
            liActive.classList.remove('active');
          }

          el.target.classList.add('active');
          chrome.storage.local.set({oxyplug_active_url: className});
          chrome.tabs.sendMessage(
            Popup.currentTab.id, {
              scrollTo: className,
              messages: details.messages,
              issueTypes: details.issueTypes
            },
            () => {
              if (!chrome.runtime.lastError) {
                console.log('fine');
              } else {
                console.log(chrome.runtime.lastError);
              }
            }
          );
        };

        // Filter the list
        const filterTarget = 'data-' + await getLocalStorage('oxyplug_active_filter');
        if (filterTarget == 'data-all-issue') {
          li.style.display = 'block';
        } else {
          li.style.display = li.hasAttribute(filterTarget) ? 'block' : 'none';
        }

        if (!liExists) {
          // Exclude image button
          const excludeButton = document.createElement('button');
          excludeButton.classList.add('oxyplug-icon-exclude');
          excludeButton.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const parent = e.target.parentNode;
            const currentHost = await Popup.getCurrentHost();
            if (Popup.issues && Popup.issues[currentHost]) {
              const item = Popup.issues[currentHost]['issues'][parent.dataset.target];

              if (item) {
                // Exclude src
                const exclusion = item['url'];
                let oxyplugTechSeoExclusions = await getLocalStorage('oxyplug_tech_seo_exclusions');
                if (oxyplugTechSeoExclusions) {
                  if (oxyplugTechSeoExclusions[currentHost]) {
                    oxyplugTechSeoExclusions[currentHost].push(exclusion);
                  } else {
                    oxyplugTechSeoExclusions = {[currentHost]: [exclusion]};
                  }
                } else {
                  oxyplugTechSeoExclusions = {[currentHost]: [exclusion]};
                }
                await chrome.storage.local.set({oxyplug_tech_seo_exclusions: oxyplugTechSeoExclusions});

                // Remove exclusions from localstorage and list
                const issueTypes = item['issueTypes'];
                issueTypes.forEach((issueType) => {
                  const key = issueType.replace(/([A-Z])/g, '-$1').toLowerCase();
                  Popup.issues[currentHost]['count'][key] -= 1;
                  document.querySelector(`#${key} .has-issue`).innerText = Popup.issues[currentHost]['count'][key];
                });
                delete Popup.issues[currentHost]['issues'][parent.dataset.target];
                await chrome.storage.local.set({oxyplug_tech_seo_issues: Popup.issues});

                // Decrease all-issue
                const allIssueEl = document.querySelector('#all-issue .has-issue');
                allIssueEl.innerText = parseInt(allIssueEl.innerText) - 1;
              }
            }
            parent.remove();
            alert(
              "This image src got excluded and won't be scanned again.\n" +
              "You can include it again in exclusions tab.\n" +
              "It is visible after closing/reopening the extension."
            );
          };
          li.prepend(excludeButton);

          // Make complete src to be able to show in new tab
          if (!completeSrc.startsWith('data:image')) {
            if (!completeSrc.startsWith('http')) {
              const currentTabUrl = new URL(Popup.currentTab.url);
              completeSrc = completeSrc.replace(/^\/+/, '');
              completeSrc = currentTabUrl.origin + '/' + completeSrc;
            }
            const currentPageUrl = new URL(completeSrc);
            currentPageUrl.searchParams.set('by-oxyplug-tech-seo', 'true');
            completeSrc = currentPageUrl.toString();
          }

          // Open in new tab
          const a = document.createElement('a');
          a.classList.add('oxyplug-icon-new-tab');
          if (completeSrc.startsWith('data:image')) {
            a.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!window.myWindow || window.myWindow.closed) {
                window.myWindow = window.open('');
                myWindow.document.write(`<img src="${completeSrc}" />`);
              } else {
                window.myWindow.focus();
              }
            };
            li.prepend(a);
          } else {
            a.href = completeSrc;
            a.target = '_blank';
            a.onclick = (e) => {
              e.stopPropagation();
            };
            li.prepend(a);
          }

          oxyplugIssueListUl.append(li);
        }
      }

      // Highlight active url
      await Popup.highlightActiveUrl();

      // Show issues count on filters
      for (const [id, count] of Object.entries(issuesCount)) {
        // Update *-issue filters
        await Popup.updateFilters(id, count);
      }

      // Update all-issue filter
      await Popup.updateFilters('all-issue', issuesArray.length);

      // Highlight active filter
      await Popup.highlightActiveFilter();

    } else {
      await Common.showIssues(['No issues found on the page :)'], 'info');
    }

    await Popup.toggleSpinner('none');
    await Popup.toggleList('block');
    this.start.disabled = false;
  };

  /**
   * Update filters
   * @param id
   * @param count
   * @returns {Promise<void>}
   */
  static async updateFilters(id, count) {
    const span = document.querySelector('#' + id + ' > span');
    span.innerText = count > 99 ? '+99' : count;

    if (count > 0) {
      span.classList.add('has-issue');
    } else {
      span.classList.remove('has-issue');
    }

    if (['next-gen-formats-issue', 'lazy-load-issue'].includes(id)) {
      span.classList.add('warning');
    } else if (id === 'lcp-issue') {
      span.classList.add('info');
    }
  }

  /**
   * Show/Hide the loading spinner
   * @param status
   * @returns {Promise<void>}
   */
  static async toggleSpinner(status) {
    document.getElementById('oxyplug-is-processing').style.display = status;
  };

  /**
   * Show/Hide the list of issues
   * @param status
   * @returns {Promise<void>}
   */
  static async toggleList(status) {
    const oxyplugIssueList = document.querySelector('#oxyplug-issue-list');
    oxyplugIssueList.querySelector('.oxyplug-tabs').style.display = status;
    oxyplugIssueList.querySelector('ul').style.display = status;
  };

  /**
   * Rename the text of `Start!` button to `Restart!`
   * @returns {Promise<void>}
   */
  static async start2Restart() {
    this.start.innerText = 'Restart!';
  };

  /**
   * Get current tab
   * @returns {Promise<chrome.tabs.Tab>}
   */
  static async getCurrentTab() {
    let queryOptions = {active: true, currentWindow: true};
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
  }

  /**
   * Get current tab domain i.e. location.hostname
   * @returns {Promise<string|null>}
   */
  static async getCurrentHost() {
    if (Popup.currentTab && Popup.currentTab.url) {
      return new URL(Popup.currentTab.url).hostname;
    }

    return null;
  }
}

Popup.init().then(() => {
});

/**
 * Get local storage
 * @param key
 * @returns {Promise<unknown>}
 */
const getLocalStorage = (key) => {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, resolve);
  })
    .then(response => {
      return response[key]
    })
    .catch(() => {
      return null
    });
};
