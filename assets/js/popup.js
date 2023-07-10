class Popup {
  static issues = {};
  static start;
  static stop;

  /**
   * Init
   * @returns {Promise<void>}
   */
  static async init() {
    return new Promise(async (resolve, reject) => {
      try {
        // Reset the exclusion notification that has already been run
        await Common.setLocalStorage({exclusion_already_alerted: false});

        // Stop and start elements
        Popup.start = await Common.getElement('#start');
        Popup.stop = await Common.getElement('#stop');
        Popup.restore = await Common.getElement('#restore');

        // Get current tab
        Popup.currentTab = await Common.getCurrentTab();
        Popup.currentHost = await Popup.getCurrentHost();

        // Is it processing?
        const isProcessing = Boolean(await Common.getLocalStorage('is_processing'));
        if (isProcessing) {
          await Popup.processingState(true);
          await Popup.start2Restart();
          const checkProcessing = setInterval(async () => {
            const isProcessing = Boolean(await Common.getLocalStorage('is_processing'));
            if (!isProcessing) {
              clearInterval(checkProcessing);
              window.close();
            }
          }, 3000);
        } else {
          // Load issues on the page (From Storage)
          Popup.issues = await Common.getLocalStorage('issues');
          if (Popup.issues && Popup.issues[Popup.currentHost]) {
            await Popup.loadList(Popup.issues[Popup.currentHost]);
            const activeLi = await Common.getElement('#oxyplug-issue-list ul li.active');
            if (activeLi) {
              activeLi.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
              });
            }
          }

          // Enable restore button?
          await Popup.restoreAble();
        }

        // Max image filesize
        let maxImageFilesize = Number(await Common.getLocalStorage('max_image_filesize'));
        maxImageFilesize = isNaN(maxImageFilesize) ? 150 : Math.abs(maxImageFilesize);
        const maxImageFilesizeEl = await Common.getElement('#oxyplug-max-image-filesize');
        await Common.setLocalStorage({max_image_filesize: maxImageFilesize});
        maxImageFilesizeEl.value = maxImageFilesize;
        maxImageFilesizeEl.addEventListener('input', (el) => {
          let value = Number(el.target.value);
          value = isNaN(value) || value < 1 ? 1 : value;
          Common.setLocalStorage({max_image_filesize: value});
        });

        // Max image alt
        let maxImageAlt = Number(await Common.getLocalStorage('max_image_alt'));
        maxImageAlt = isNaN(maxImageAlt) ? 150 : Math.abs(maxImageAlt);
        const maxImageAltEl = await Common.getElement('#oxyplug-max-image-alt');
        await Common.setLocalStorage({max_image_alt: maxImageAlt});
        maxImageAltEl.value = maxImageAlt;
        maxImageAltEl.addEventListener('input', (el) => {
          let value = Number(el.target.value);
          value = isNaN(value) || value < 1 ? 1 : value;
          Common.setLocalStorage({max_image_alt: value});
        });

        // Max scrolling
        let maxScrolling = Number(await Common.getLocalStorage('max_scrolling'));
        maxScrolling = isNaN(maxScrolling) ? 0 : Math.abs(maxScrolling);
        const maxScrollingEl = await Common.getElement('#oxyplug-max-scrolling');
        await Common.setLocalStorage({max_scrolling: maxScrolling});
        maxScrollingEl.value = maxScrolling;
        maxScrollingEl.addEventListener('input', (el) => {
          let value = Number(el.target.value);
          value = isNaN(value) || value < 0 ? 0 : value;
          Common.setLocalStorage({max_scrolling: value});
        });

        // X Color
        const xColor = await Common.getLocalStorage('x_color');
        const XColorEl = await Common.getElement('#oxyplug-x-color');
        XColorEl.value = xColor ?? '#ff0000';
        XColorEl.addEventListener('change', (el) => {
          const isColor = /^#[\dA-F]{6}$/i.test(el.target.value);
          const xColor = isColor ? el.target.value : '#ff0000';
          Common.setLocalStorage({x_color: xColor});

          chrome.tabs.sendMessage(Popup.currentTab.id, {newXColor: xColor}, () => {
            if (!chrome.runtime.lastError) {
              console.log('fine');
            } else {
              console.log(chrome.runtime.lastError);
            }
          });
        });

        // X Color All
        const xColorAll = await Common.getLocalStorage('x_color_all');
        const XColorAllEl = await Common.getElement('#oxyplug-x-color-all');
        XColorAllEl.value = xColorAll ?? '#0000ff';
        XColorAllEl.addEventListener('change', (el) => {
          const isColor = /^#[\dA-F]{6}$/i.test(el.target.value);
          const xColorAll = isColor ? el.target.value : '#0000ff';
          Common.setLocalStorage({x_color_all: xColorAll});

          chrome.tabs.sendMessage(Popup.currentTab.id, {newXColorAll: xColorAll}, () => {
            if (!chrome.runtime.lastError) {
              console.log('fine');
            } else {
              console.log(chrome.runtime.lastError);
            }
          });
        });

        // RTL
        const rtlScrolling = await Common.getLocalStorage('rtl_scrolling');
        const rtlScrollingEl = await Common.getElement('#oxyplug-rtl-scrolling');
        rtlScrollingEl.checked = rtlScrolling ?? false;
        rtlScrollingEl.addEventListener('change', (el) => {
          Common.setLocalStorage({rtl_scrolling: el.target.checked});
        });

        // Disable <a> tags
        const disableATags = await Common.getLocalStorage('disable_a_tags');
        const disableATagsEl = await Common.getElement('#oxyplug-disable-a-tags');
        disableATagsEl.checked = disableATags ?? false;
        disableATagsEl.addEventListener('change', (el) => {
          Common.setLocalStorage({disable_a_tags: el.target.checked});
        });

        // Disable mouse events (up, down, click)
        const disableMouseEvents = await Common.getLocalStorage('disable_mouse_events');
        const disableMouseEventsEl = await Common.getElement('#oxyplug-disable-mouse-events');
        disableMouseEventsEl.checked = disableMouseEvents ?? false;
        disableMouseEventsEl.addEventListener('change', (el) => {
          Common.setLocalStorage({disable_mouse_events: el.target.checked});
        });

        // Hide overlays on Oxyplug's X in order to be clickable
        const hideXOverlays = await Common.getLocalStorage('hide_x_overlays');
        const hideXOverlaysEl = await Common.getElement('#oxyplug-hide-x-overlays');
        hideXOverlaysEl.checked = hideXOverlays ?? false;
        hideXOverlaysEl.addEventListener('change', (el) => {
          Common.setLocalStorage({hide_x_overlays: el.target.checked});
        });

        // Get exclusions for exclusions tab
        const exclusions = await Common.getLocalStorage('exclusions');
        if (exclusions && exclusions[Popup.currentHost] && exclusions[Popup.currentHost].length) {
          const exclusionsEl = await Common.getElement('#exclusions');
          const exclusionsUl = await exclusionsEl.querySelector('ul');
          const noExclusionsEl = await exclusionsEl.querySelector('p');

          // Remove `No exclusions`
          if (noExclusionsEl) {
            noExclusionsEl.remove();
          }

          // No exclusions element
          const p = document.createElement('p');
          p.innerText = 'No exclusions.';

          // Create the exclusions list
          for (const exclusion of exclusions[Popup.currentHost]) {
            const exclusionLi = document.createElement('li');
            exclusionLi.innerText = exclusion;
            exclusionLi.onclick = async (e) => {
              e.stopPropagation();
              e.preventDefault();
              const index = exclusions[Popup.currentHost].indexOf(exclusion);
              if (index !== -1)
                exclusions[Popup.currentHost].splice(index, 1);
              await Common.setLocalStorage({exclusions: exclusions});
              exclusionLi.remove();

              // No exclusions.
              if (!await exclusionsUl.querySelector('li')) {
                exclusionsEl.append(p);
              }
            };
            exclusionsUl.append(exclusionLi);
          }
        }

        // Start Analyzing
        Popup.start.addEventListener('click', async () => {
          try {
            await Popup.resetList();
            await Common.setLocalStorage({is_processing: true, stopped: false});
            await Popup.processingState(true);
            await Popup.restoreAble(true);
            await chrome.tabs.sendMessage(Popup.currentTab.id, {start: true});
          } catch (error) {
            console.log(error)
          }
        });

        // Stop Analyzing
        Popup.stop.addEventListener('click', async () => {
          await Common.setLocalStorage({is_processing: false, stopped: true});
          await Popup.processingState(false);
        });

        // Clear Xs and restore the backup DOM
        Popup.restore.addEventListener('click', async () => {
          await chrome.tabs.sendMessage(Popup.currentTab.id, {restore: true});
          await Popup.resetList();
        });

        // Find issues on the page
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          return new Promise(async (resolve, reject) => {
            try {
              await Common.setLocalStorage({is_processing: false});
              await Popup.processingState(false);
              await Popup.restoreAble();

              if (request.issues) {
                if (Popup.issues)
                  Popup.issues[Popup.currentHost] = request.issues;
                else
                  Popup.issues = {[Popup.currentHost]: request.issues};

                await Popup.loadList(request.issues);
                await Popup.start2Restart();
                await Popup.stopAble();
                await Popup.highlightActiveUrl();
                await Popup.highlightActiveFilter();
              } else if (request.showIssues) {
                await Common.showIssues(request.showIssues, request.issueTypes, 'popup');
              }

              resolve({status: true});
            } catch (error) {
              console.log(error);
              reject(error);
            }
          })
            .then(response => {
              sendResponse(response);
            })
            .catch(response => {
              return response;
            });
        });

        // Change `start` to `restart` after the first execution
        if (Popup.issues && Popup.issues[Popup.currentHost]) {
          await Popup.start2Restart();
          await Popup.stopAble();
        }

        // Navigation between the pages
        const navButtons = await Common.getElements('nav button');
        navButtons.forEach((navButton) => {
          navButton.addEventListener('click', async (el) => {

            // Highlight the active button
            const buttons = await navButton.parentElement.querySelectorAll('button');
            buttons.forEach((button) => {
              button.classList.remove('button-active');
            });
            el.target.classList.add('button-active');

            // Change page/content
            const sectionId = navButton.dataset.target;
            const content = await Common.getElement('#content');
            const pages = content.querySelectorAll(':scope > div');
            pages.forEach((page) => {
              page.style.display = page.id === sectionId ? 'block' : 'none';
            });

          }, false);
        });

        // Filters
        const filters = await Common.getElement('.oxyplug-tabs');
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
            Common.setLocalStorage({active_filter: el.id});

            // Filter the list
            const filterTarget = 'data-' + el.id;
            const issueListItems = document.querySelectorAll('#oxyplug-issue-list ul li');
            if (filterTarget === 'data-all-issue') {
              issueListItems.forEach((li) => {
                li.style.display = 'block';
              });
            } else {
              issueListItems.forEach((li) => {
                li.style.display = li.hasAttribute(filterTarget) ? 'block' : 'none';
              });
            }

          });
        });

        // Modal
        await Common.makeModalActions('oxyplug-modal-message');

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Show spinner, hide list, disable start button
   * @returns {Promise<void>}
   */
  static async processingState(isProcessing = true) {
    return new Promise(async (resolve, reject) => {
      try {
        if (isProcessing) {
          await Popup.toggleSpinner('block');
          await Popup.toggleList('none');
          Popup.start.disabled = true;
          Popup.stop.disabled = false;
        } else {
          await Popup.toggleSpinner('none');
          await Popup.toggleList('block');
          Popup.start.disabled = false;
          Popup.stop.disabled = true;
        }

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   *
   * @param text
   * @param length
   * @param putAfter
   * @returns {Promise<string|*>}
   */
  static async getExcerpt(text, length = 50, putAfter = '...') {
    return new Promise((resolve, reject) => {
      try {
        if (text.length > length) {
          return resolve(text.substring(0, length) + putAfter);
        }

        resolve(text);
      } catch (error) {
        console.log(error);
        reject(text);
      }
    })
      .then(response => {
        return response;
      })
      .catch(response => {
        return response;
      });
  };

  /**
   * Highlight active url
   * @returns {Promise<void>}
   */
  static async highlightActiveUrl() {
    return new Promise(async (resolve, reject) => {
      try {
        const activeUrl = await Common.getLocalStorage('active_url');
        if (activeUrl) {
          const li = await Common.getElement('#oxyplug-issue-list ul li[data-target="' + activeUrl + '"]');
          if (li) {
            li.classList.add('active');
          }
        }

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  };

  /**
   * Highlight active filter
   * @returns {Promise<void>}
   */
  static async highlightActiveFilter() {
    return new Promise(async (resolve, reject) => {
      try {
        const activeFilter = await Common.getLocalStorage('active_filter');
        if (activeFilter) {
          const li = await Common.getElement('#oxyplug-issue-list #' + activeFilter);
          if (li) {
            li.classList.add('active');
          }
        }

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  };

  /**
   * Clear the list and reset the data stored in localStorage
   * @returns {Promise<unknown>}
   */
  static async resetList() {
    return new Promise(async (resolve) => {
      if (Popup.issues && Popup.issues[Popup.currentHost]) {
        Popup.issues[Popup.currentHost]['issues'] = {};
        for (const key of Object.keys(Popup.issues[Popup.currentHost]['count'])) {
          Popup.issues[Popup.currentHost]['count'][key] = 0;
          await Popup.updateFilters(key, 0);
        }
        await Popup.updateFilters('all-issue', 0);
        await Common.setLocalStorage({issues: Popup.issues});
        const issueList = await Common.getElement('#oxyplug-issue-list ul');
        issueList.innerHTML = '';
      }

      resolve();
    });
  }

  /**
   * Load the list of issues
   * @param issues
   * @returns {Promise<void>}
   */
  static async loadList(issues) {
    return new Promise(async (resolve, reject) => {
      try {
        const lastAuditDate = issues.lastAuditDate ?? 'N/A';
        const issuesCount = issues.count;
        issues = issues.issues;
        const issuesArray = Object.keys(issues);

        // Set last audit date
        const lastAuditDateEl = await Common.getElement('#last-audit-date > span');
        lastAuditDateEl.innerText = lastAuditDate;

        if (issuesArray.length) {
          // Sort
          issues = issuesArray.sort().reduce((obj, key) => {
            obj[key] = issues[key];
            return obj;
          }, {});

          // Empty the list of issues
          const issueList = await Common.getElement('#oxyplug-issue-list ul');
          issueList.innerHTML = '';

          // Make the list of issues
          for (const [className, details] of Object.entries(issues)) {
            const liExists = issueList.querySelector(`[data-target="${className}"]`);
            let completeSrc = details.url;
            const srcExcerpt = await Popup.getExcerpt(completeSrc, 256);
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
              const liActive = issueList.querySelector('li.active');
              if (liActive) {
                liActive.classList.remove('active');
              }

              el.target.classList.add('active');
              Common.setLocalStorage({active_url: className});

              const message = {
                scrollTo: className,
                messages: details.messages,
                issueTypes: details.issueTypes
              };

              const callback = () => {
                if (!chrome.runtime.lastError) {
                  console.log('fine');
                } else {
                  console.log(chrome.runtime.lastError);
                }
              };

              chrome.tabs.sendMessage(Popup.currentTab.id, message, callback);
            };

            // Filter the list
            const filterTarget = 'data-' + await Common.getLocalStorage('active_filter');
            if (filterTarget == 'data-all-issue') {
              li.style.display = 'block';
            } else {
              li.style.display = li.hasAttribute(filterTarget) ? 'block' : 'none';
            }

            if (!liExists) {
              // Exclude image button
              const exclusionsEl = await Common.getElement('#exclusions');
              const exclusionsUl = await exclusionsEl.querySelector('ul');
              const excludeButton = document.createElement('button');
              excludeButton.classList.add('oxyplug-icon-exclude');
              excludeButton.onclick = async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const parent = e.target.parentNode;
                if (Popup.issues && Popup.issues[Popup.currentHost]) {
                  const item = Popup.issues[Popup.currentHost]['issues'][parent.dataset.target];
                  if (item) {
                    // Exclude src
                    const exclusion = item['url'];
                    let exclusions = await Common.getLocalStorage('exclusions');
                    if (!exclusions || !exclusions[Popup.currentHost])
                      exclusions = {[Popup.currentHost]: [exclusion]};
                    else if (!exclusions[Popup.currentHost].includes(exclusion))
                      exclusions[Popup.currentHost].push(exclusion);

                    await Common.setLocalStorage({exclusions: exclusions});

                    // Reset issue list
                    const keys = [];
                    for (const key in Popup.issues[Popup.currentHost]['issues']) {
                      if (Popup.issues[Popup.currentHost]['issues'][key].url === exclusion) {
                        keys.push(key);
                        await issueList.querySelector(`li[data-target="${key}"]`).remove();
                      }
                    }

                    // Add exclusion to the exclusions list
                    const exclusionLi = document.createElement('li');
                    exclusionLi.innerText = exclusion;
                    exclusionLi.onclick = async (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const exclusions = await Common.getLocalStorage('exclusions');
                      const index = exclusions[Popup.currentHost].indexOf(exclusion);
                      if (index !== -1)
                        exclusions[Popup.currentHost].splice(index, 1);
                      await Common.setLocalStorage({exclusions: exclusions});
                      exclusionLi.remove();

                      // No exclusions.
                      const p = document.createElement('p');
                      p.innerText = 'No exclusions.';
                      if (!await exclusionsUl.querySelector('li')) {
                        exclusionsEl.append(p);
                      }
                    };
                    exclusionsUl.append(exclusionLi);
                    const noExclusionsEl = await exclusionsEl.querySelector('p');
                    if (noExclusionsEl) {
                      noExclusionsEl.remove();
                    }

                    // Remove exclusions from localStorage and issues list
                    const issueTypes = item['issueTypes'];
                    for (const key of keys) {
                      for (const issueType of issueTypes) {
                        const issueTypeKey = issueType.replace(/([A-Z])/g, '-$1').toLowerCase();
                        Popup.issues[Popup.currentHost]['count'][issueTypeKey] -= 1;
                        const el = await Common.getElement(`#${issueTypeKey} .has-issue`);
                        el.innerText = Popup.issues[Popup.currentHost]['count'][issueTypeKey];
                      }
                      delete Popup.issues[Popup.currentHost]['issues'][key];

                      // Decrease all-issue
                      const allIssueEl = await Common.getElement('#all-issue .has-issue');
                      allIssueEl.innerText = parseInt(allIssueEl.innerText) - 1;
                    }
                    await Common.setLocalStorage({issues: Popup.issues});
                  }
                }

                const exclusionAlreadyAlerted = Boolean(await Common.getLocalStorage('exclusion_already_alerted'));
                if (exclusionAlreadyAlerted === false) {
                  await Common.setLocalStorage({exclusion_already_alerted: true});
                  alert(
                    "This image src got excluded and won't be audited anymore.\n" +
                    "You can include it again in exclusions tab.\n"
                  );
                }
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

              issueList.append(li);
            }
          }

          // Highlight active url
          await Popup.highlightActiveUrl();
        } else {
          await Common.showIssues(['No issues found on the page :)'], 'info', 'popup');
        }

        // Show issues count on filters
        for (const [id, count] of Object.entries(issuesCount)) {
          // Update *-issue filters
          await Popup.updateFilters(id, count);
        }

        // Update all-issue filter
        await Popup.updateFilters('all-issue', issuesArray.length);

        // Highlight active filter
        await Popup.highlightActiveFilter();

        // Hide processing state and show result
        await Popup.processingState(false);

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    })
      .then(response => {
        return response;
      })
      .catch(response => {
        return response;
      });
  };

  /**
   * Update filters
   * @param id
   * @param count
   * @returns {Promise<void>}
   */
  static async updateFilters(id, count) {
    return new Promise(async (resolve, reject) => {
      try {
        const span = await Common.getElement('#' + id + ' > span');
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

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Show/Hide the loading spinner
   * @param status
   * @returns {Promise<void>}
   */
  static async toggleSpinner(status) {
    const isProcessing = await Common.getElement('#oxyplug-is-processing');
    isProcessing.style.display = status;
  };

  /**
   * Show/Hide the list of issues
   * @param status
   * @returns {Promise<void>}
   */
  static async toggleList(status) {
    return new Promise(async (resolve, reject) => {
      try {
        const issueList = await Common.getElement('#oxyplug-issue-list');
        issueList.querySelector('.oxyplug-tabs').style.display = status;
        issueList.querySelector('ul').style.display = status;

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    })
      .then(response => {
        return response;
      })
      .catch(response => {
        return response;
      });
  };

  /**
   * Rename the text of `Start` button to `Restart`
   * @returns {Promise<void>}
   */
  static async start2Restart() {
    Popup.start.innerText = 'Restart';
  };

  /**
   * Enable/Disable Stop
   * @returns {Promise<void>}
   */
  static async stopAble(able = false) {
    Popup.stop.disable = able;
  };

  /**
   * Enable/Disable Restore?
   * @returns {Promise<void>}
   */
  static async restoreAble(able = false) {
    const backup = Boolean(await Common.getLocalStorage('backup'));
    Popup.restore.disabled = able === true ? able : !backup;
  };

  /**
   * Get current tab domain i.e. location.hostname
   * @returns {Promise<string|null>}
   */
  static async getCurrentHost() {
    return new Promise((resolve, reject) => {
      try {
        if (Popup.currentTab && Popup.currentTab.url) {
          return resolve(new URL(Popup.currentTab.url).hostname);
        }

        resolve(null);
      } catch (error) {
        console.log(error);
        reject(null);
      }
    })
      .then(response => {
        return response;
      })
      .catch(response => {
        return response;
      });
  }
}

Popup.init()
  .then(() => {
    console.log('Popup init');
  })
  .catch(() => {
    console.log('Popup error');
  });