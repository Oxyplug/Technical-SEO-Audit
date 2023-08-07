class ContentScript {
  static lazyImgs = [];
  static lazyTries = [];
  static scrollables = [];
  static scrollableIndex = 0;
  static rtl = false;

  /**
   * Init
   * @returns {Promise<void>}
   */
  static async init() {
    ContentScript.issues = {};
    Audit.loadFailsList = await Common.getLocalStorage('load_fails');
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      return await new Promise(async (resolve) => {
        if (request.start === true) {
          await ContentScript.backupDOM();
          await ContentScript.startAnalyzing();
        } else if (request.reload === true) {
          location.reload();
        } else if (request.restore === true) {
          const backups = await Common.getLocalStorage('backups');
          if (backups && backups[location.host]) {
            const body = await Common.getElement('body');
            body.innerHTML = backups[location.host];
          }
        } else if (request.scrollTo) {
          await ContentScript.scrollToPoint(request);
        } else if (request.newXColor) {
          await ContentScript.setXColor(request);
        } else if (request.newXColorAll) {
          await ContentScript.setXColorAll(request);
        }
        resolve();
      })
        .then(response => {
          sendResponse({status: true, message: response});
        })
        .catch(error => {
          sendResponse({status: false, message: error});
        });
    });
  }

  /**
   * Mark lazy images to make them load
   * @param imgs
   * @returns {Promise<void>}
   */
  static async markLazies(imgs) {
    return new Promise(async (resolve, reject) => {
      await chrome.runtime.sendMessage({log: 'Marking lazy images to be checked...'});
      try {
        ContentScript.lazyImgs = [];
        ContentScript.lazyTries = [];
        for (const [index, img] of Object.entries(imgs)) {
          const src = img.currentSrc != '' ? img.currentSrc : img.src;
          if (
            ((img.naturalWidth == 0 || img.naturalHeight == 0) || (img.naturalWidth == 1 && img.naturalHeight == 1)) &&
            !(Audit.loadFailsList && Audit.loadFailsList[src])
          ) {
            if (img.hasAttribute('loading')) {
              img.dataset.hasLoading = img.getAttribute('loading');
            } else {
              img.dataset.hasLoading = 'no';
            }
            img.setAttribute('loading', 'eager');
            img.classList.add(`oxyplug-tech-seo-lazy-${index}`);
            ContentScript.lazyImgs.push(img);
          }
        }

        if (ContentScript.lazyImgs.length) {
          await chrome.runtime.sendMessage({log: 'Marked lazy images...'});
        } else {
          await chrome.runtime.sendMessage({log: 'No lazy images found to be marked and checked...'});
        }

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Mark scrollables like simple carousels to scroll them and load possible lazy images
   * @returns {Promise<void>}
   */
  static async markScrollables() {
    return new Promise(async (resolve, reject) => {
      await chrome.runtime.sendMessage({log: 'Marking scrollables to be scrolled to load lazy images...'});
      try {
        ContentScript.scrollables = [];
        const allElements = await Common.getElements('body *:not(script, style, link, meta)');
        for (let e = 0; e < allElements.length; e++) {
          const style = getComputedStyle(allElements[e]);

          const scrollableX =
            (allElements[e].clientWidth < allElements[e].scrollWidth) &&
            (['auto', 'scroll'].includes(style.overflowX) || ['auto', 'scroll'].includes(style.overflow));

          const scrollableY =
            (allElements[e].clientHeight < allElements[e].scrollHeight) &&
            (['auto', 'scroll'].includes(style.overflowY) || ['auto', 'scroll'].includes(style.overflow));

          if (scrollableX || scrollableY) {
            let className;
            if (scrollableX) {
              className = 'oxyplug-tech-seo-scrollable-x';
            } else if (scrollableY) {
              className = 'oxyplug-tech-seo-scrollable-y';
            }

            /**
             * Element.offsetTop won't work in this scenario as we are not scrolling the whole page but a div.
             * And if we are to use getBoundingClientRect(), its value keeps changing after scrolling so at first point
             * it needs to be stored somewhere like dataset and be used afterwards.
             */
            const parent = allElements[e].parentElement;
            if (parent.classList.contains('oxyplug-tech-seo-scrollable-y')) {
              const rect = allElements[e].getBoundingClientRect();
              const parentRect = allElements[e].parentElement.getBoundingClientRect();
              allElements[e].dataset.rectTop = String(rect.top - parentRect.top);
            }
            allElements[e].classList.add(className);
            ContentScript.scrollables.push(allElements[e]);
          }
        }

        if (ContentScript.scrollables.length) {
          await chrome.runtime.sendMessage({log: 'Marked scrollables...'});
        }

        await chrome.runtime.sendMessage({progress: 60});
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
   * Load lazy images by scrolling the page
   * @returns {Promise<void>}
   */
  static async scrollPage() {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({log: 'Scrolling the page to load lazy images...'});
        chrome.runtime.sendMessage({progress: 20});

        const docEl = document.documentElement;

        // Go to top to start scrolling
        window.scroll({top: 0});

        // Down
        const scrollForwardVertically = async () => {
          const stopped = await ContentScript.checkStop();
          if (stopped) return resolve(stopped);

          // Limit scrolling
          let scrollLimit = docEl.scrollHeight;
          const maxScrolling = await Common.getLocalStorage('max_scrolling');
          if (maxScrolling > 0 && maxScrolling <= scrollLimit) {
            scrollLimit = maxScrolling;
          } else if (scrollLimit > Common.oxyplugScrollLimit) {
            scrollLimit = Common.oxyplugScrollLimit;
          }

          const shouldContinue = docEl.clientHeight + docEl.scrollTop < scrollLimit - 1;
          if (shouldContinue) {

            // Scroll Down
            window.scrollTo({
              top: docEl.scrollTop + docEl.clientHeight,
              behavior: 'smooth'
            });

            // Wait 0.7 second
            await ContentScript.wait(700);

            // Call function again
            await scrollForwardVertically();
          } else {
            await chrome.runtime.sendMessage({progress: 40});
            await scrollBackwardVertically();
          }
        };

        // Up
        const scrollBackwardVertically = async () => {
          const stopped = await ContentScript.checkStop();
          if (stopped) return resolve(stopped);

          const shouldContinue = docEl.scrollTop > 1;
          if (shouldContinue) {

            // Scroll Up
            window.scrollTo({
              top: docEl.scrollTop - docEl.clientHeight,
              behavior: 'smooth'
            });

            // Wait 0.7 second
            await ContentScript.wait(700);

            // Call function again
            return resolve(await scrollBackwardVertically());
          }

          await chrome.runtime.sendMessage({log: 'Scrolled the page...'});

          resolve();
        };

        // Start scrolling
        scrollForwardVertically();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Move the page to the point of scrollable
   * @param scrollable
   * @returns {Promise<void>}
   */
  static async gotoSection(scrollable) {
    return new Promise((resolve, reject) => {
      try {
        if (scrollable.dataset.rectTop) {
          scrollable.parentElement.scroll({
            top: Number(scrollable.dataset.rectTop),
            behavior: 'smooth'
          });
        } else {
          const scrollableY = scrollable.getBoundingClientRect().top + window.scrollY;
          window.scrollTo(0, scrollableY);
        }

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Check if there are more scrollables
   * @returns {Promise<void>}
   */
  static async moreScrollables() {
    return new Promise(async (resolve, reject) => {
      try {
        if (ContentScript.scrollables.length) {
          const nextScrollable = ContentScript.scrollables[++ContentScript.scrollableIndex];
          if (nextScrollable === undefined) {
            ContentScript.scrollables = [];
          } else {
            await ContentScript.gotoSection(nextScrollable);
            return resolve(await ContentScript.initScroll(nextScrollable));
          }
        }
        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Scroll forward horizontally
   * @param scrollable
   * @param scrollEndPoint
   * @returns {Promise<unknown>}
   */
  static async scrollForwardHorizontally(scrollable, scrollEndPoint) {
    return new Promise(async (resolve) => {
      const stopped = await ContentScript.checkStop();
      if (stopped) return resolve(stopped);

      if (ContentScript.rtl) {
        if (Math.abs(scrollable.scrollLeft) < scrollEndPoint) {

          // Scroll Forward
          scrollable.scrollTo({
            left: scrollable.scrollLeft - scrollable.clientWidth,
            behavior: 'smooth'
          });

          // Wait 0.7 second
          await ContentScript.wait(700);

          // Call function again
          return resolve(await ContentScript.scrollForwardHorizontally(scrollable, scrollEndPoint));
        }
      } else {
        if (scrollable.scrollLeft < scrollEndPoint) {
          // Scroll Forward
          scrollable.scrollTo({
            left: scrollable.scrollLeft + scrollable.clientWidth,
            behavior: 'smooth'
          });

          // Wait 0.7 second
          await ContentScript.wait(700);

          // Call function again
          return resolve(await ContentScript.scrollForwardHorizontally(scrollable, scrollEndPoint));
        }
      }

      resolve(await ContentScript.scrollBackwardHorizontally(scrollable, 0));
    });
  }

  /**
   * Scroll backward horizontally
   * @param scrollable
   * @param scrollEndPoint
   * @returns {Promise<unknown>}
   */
  static async scrollBackwardHorizontally(scrollable, scrollEndPoint) {
    return new Promise(async (resolve) => {
      const stopped = await ContentScript.checkStop();
      if (stopped) return resolve(stopped);

      if (ContentScript.rtl) {
        if (scrollable.scrollLeft < scrollEndPoint) {

          // Scroll Backward
          scrollable.scrollTo({
            left: scrollable.scrollLeft + scrollable.clientWidth,
            behavior: 'smooth'
          });

          // Wait 0.7 second
          await ContentScript.wait(700);

          // Call function again
          return resolve(await ContentScript.scrollBackwardHorizontally(scrollable, scrollEndPoint));
        }
      } else {
        if (scrollable.scrollLeft > scrollEndPoint) {

          // Scroll Backward
          scrollable.scrollTo({
            left: scrollable.scrollLeft - scrollable.clientWidth,
            behavior: 'smooth'
          });

          // Wait 0.7 second
          await ContentScript.wait(700);

          // Call function again
          return resolve(await ContentScript.scrollBackwardHorizontally(scrollable, scrollEndPoint));
        }
      }

      await ContentScript.moreScrollables();
      resolve();
    });
  }

  /**
   * Scroll the scrollables horizontally
   * @param scrollable
   * @returns {Promise<void>}
   */
  static async scrollHorizontally(scrollable) {
    return new Promise(async (resolve, reject) => {
      try {
        const stopped = await ContentScript.checkStop();
        if (stopped) return resolve(stopped);

        await ContentScript.gotoSection(scrollable);

        const scrollEndPointWithTolerance = scrollable.scrollWidth - scrollable.clientWidth - 1;
        // Scroll to the start point depending on the layout
        scrollable.scrollLeft = ContentScript.rtl ? scrollEndPointWithTolerance : 0;
        resolve(await ContentScript.scrollForwardHorizontally(scrollable, scrollEndPointWithTolerance));
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Scroll forward vertically
   * @param scrollable
   * @param scrollEndPoint
   * @returns {Promise<unknown>}
   */
  static async scrollForwardVertically(scrollable, scrollEndPoint) {
    return new Promise(async (resolve) => {
      const stopped = await ContentScript.checkStop();
      if (stopped) return resolve(stopped);

      // Go to the section
      const scrollableY = scrollable.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, scrollableY);

      if (scrollable.scrollTop < scrollEndPoint) {

        // Scroll Forward
        scrollable.scrollTo({
          top: scrollable.scrollTop + scrollable.clientHeight,
          behavior: 'smooth'
        });

        // Wait 0.7 second
        await ContentScript.wait(700);

        // Call function again
        return resolve(await ContentScript.scrollForwardVertically(scrollable, scrollEndPoint));
      }

      await ContentScript.scrollBackwardVertically(scrollable, 0);
      resolve();
    });
  }

  /**
   * Scroll backward vertically
   * @param scrollable
   * @param scrollEndPoint
   * @returns {Promise<unknown>}
   */
  static async scrollBackwardVertically(scrollable, scrollEndPoint) {
    return new Promise(async (resolve) => {
      const stopped = await ContentScript.checkStop();
      if (stopped) return resolve(stopped);

      if (scrollable.scrollTop > scrollEndPoint) {
        // Scroll Backward
        scrollable.scrollTo({
          top: scrollable.scrollTop - scrollable.clientHeight,
          behavior: 'smooth'
        });

        // Wait 0.7 second
        await ContentScript.wait(700);

        // Call function again
        return resolve(await ContentScript.scrollBackwardVertically(scrollable, scrollEndPoint));
      }

      await ContentScript.moreScrollables();
      resolve();
    });
  }

  /**
   * Scroll the scrollables vertically
   * @param scrollable
   * @returns {Promise<void>}
   */
  static async scrollVertically(scrollable) {
    return new Promise(async (resolve, reject) => {
      try {
        const stopped = await ContentScript.checkStop();
        if (stopped) return resolve(stopped);

        await ContentScript.gotoSection(scrollable);

        const scrollEndPointWithTolerance = scrollable.scrollHeight - scrollable.clientHeight - 1;
        // Scroll to the start point
        scrollable.scrollTop = 0;
        await ContentScript.scrollForwardVertically(scrollable, scrollEndPointWithTolerance);
        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Init and start scrolling scrollables
   * @param scrollable
   * @returns {Promise<void>}
   */
  static async initScroll(scrollable) {
    return new Promise(async (resolve, reject) => {
      try {
        const stopped = await ContentScript.checkStop();
        if (stopped) return resolve(stopped);

        const classList = [...scrollable.classList];
        if (classList.includes('oxyplug-tech-seo-scrollable-x')) {
          return resolve(await ContentScript.scrollHorizontally(scrollable));
        } else if (classList.includes('oxyplug-tech-seo-scrollable-y')) {
          return resolve(await ContentScript.scrollVertically(scrollable));
        }
        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Load lazy images by scrolling scrollable sections
   * @returns {Promise<void>}
   */
  static async scrollScrollables() {
    return new Promise(async (resolve, reject) => {
      await chrome.runtime.sendMessage({log: 'Scrolling scrollables...'});
      try {
        // Iterate over scrollables to scroll
        ContentScript.scrollableIndex = 0;
        const scrollable = ContentScript.scrollables[ContentScript.scrollableIndex];
        if (scrollable) {
          return resolve(await ContentScript.initScroll(scrollable));
        }
        await chrome.runtime.sendMessage({log: 'Scrolled scrollables...'});
        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Wait for lazy images to load
   * @returns {Promise<unknown>}
   */
  static async waitForLazies() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({log: 'Waiting for lazy images to load...'});
      chrome.runtime.sendMessage({progress: 80});
      try {
        const checkImagesLoaded = setInterval(() => {

          // Stopped
          (async () => {
            const stopped = await ContentScript.checkStop();
            if (stopped) {
              clearInterval(checkImagesLoaded);
              return resolve(stopped);
            }
          })();

          // Finish it if there is no lazy image remained
          if (ContentScript.lazyImgs.length === 0) {
            clearInterval(checkImagesLoaded);
            chrome.runtime.sendMessage({log: 'Lazy images loaded...'});
            resolve();
          } else {
            for (let i = ContentScript.lazyImgs.length - 1; i >= 0; i--) {
              const lazyImg = ContentScript.lazyImgs[i];
              const className = lazyImg.className;

              // Check if it is loaded, to remove it from the array
              lazyImg.addEventListener('load', () => {
                if (lazyImg.complete) {
                  ContentScript.lazyImgs.splice(i, 1);
                }
              });

              // Check with its size if it is loaded, to remove it from the array
              if ((lazyImg.naturalWidth > 1 && lazyImg.naturalHeight > 1)) {
                ContentScript.lazyImgs.splice(i, 1);
              } else {
                // If it hasn't been loaded for the third time, ignore it
                if (ContentScript.lazyTries[className] && ContentScript.lazyTries[className] >= 3) {
                  ContentScript.lazyImgs.splice(i, 1);
                } else {
                  ContentScript.lazyTries[className] = ContentScript.lazyTries[className] ? ContentScript.lazyTries[className] + 1 : 1;
                }
              }
            }
          }
        }, 1000);
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Remove the elements that were added in the previous audit and prepare for new audit
   * @returns {Promise<void>}
   */
  static async resetElements() {
    return new Promise(async (resolve, reject) => {
      try {
        const elements = await Common.getElements('.oxyplug-tech-seo');
        elements.forEach((element) => {
          const img = element.querySelector('img');
          const i = img.dataset.oxyplug_tech_i;
          img.classList.remove(`oxyplug-tech-seo-issue-${i}`);
          delete img.dataset.oxyplug_tech_i;
          element.replaceWith(img);
        });

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Disable default scroll behavior that the page might have
   * @returns {Promise<unknown>}
   */
  static async unsetDefaultScrollBehavior() {
    return new Promise(async (resolve, reject) => {
      try {
        const htmlBody = await Common.getElement('html, body');
        htmlBody.style.setProperty('scroll-behavior', 'unset', 'important');
        await chrome.runtime.sendMessage({log: 'Customization of scrolling behaviour (if any) disabled...'});
        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Prevent <a> tags from performing any actions that may have side effects on oxyplug elements
   * @returns {Promise<void>}
   */
  static async disableATags() {
    const disableATags = await Common.getLocalStorage('disable_a_tags');
    if (disableATags) {
      return new Promise(async (resolve, reject) => {
        try {
          const as = await Common.getElements('a');
          as.forEach((a) => {
            a.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
            })
          });

          await chrome.runtime.sendMessage({log: 'All <a>s default event prevented and propagation stopped...'});

          resolve();
        } catch (error) {
          console.log(error);
          reject(error);
        }
      });
    }
  }

  /**
   * Prevent event listeners from performing any actions that may have side effects on oxyplug elements
   * @returns {Promise<void>}
   */
  static async removeEventListeners() {
    const disableMouseEvents = await Common.getLocalStorage('disable_mouse_events');
    if (disableMouseEvents) {
      return new Promise(async (resolve, reject) => {
        try {
          const elements = await Common.getElements('[onclick], [onmousedown], [onmouseup]');
          const eventListeners = ['mousedown', 'mouseup', 'click'];
          elements.forEach((element) => {
            // Remove event attributes
            eventListeners.forEach((eventListener) => {
              element.listeners = {};
              element.removeAttribute(`on${eventListener}`);
              element[`on${eventListener}`] = null;
            });

            // Clone from the element
            const clone = element.cloneNode(true);

            // Add event listener to stop it from doing anything
            eventListeners.forEach((eventListener) => {
              clone.addEventListener(eventListener, (e) => {
                e.preventDefault();
                e.stopPropagation();
              });
            });

            // Replace the element with the cloned element
            element.replaceWith(clone);
          });

          await chrome.runtime.sendMessage({log: 'Mouse events (up, down, click) disabled, default event prevented and propagation stopped...'});

          resolve();
        } catch (error) {
          console.log(error);
          reject(error);
        }
      });
    }
  }

  /**
   * Check if user has stopped the process
   * @returns {Promise<string|boolean>}
   */
  static async checkStop() {
    return new Promise(async (resolve, reject) => {
      try {
        if (Boolean(await Common.getLocalStorage('stopped'))) {
          await chrome.runtime.sendMessage({log: 'Stopped by user!'});
          return resolve('stopped');
        }

        resolve(false);
      } catch (error) {
        console.log(error)
        reject(error);
      }
    })
      .then(response => {
        return response;
      })
      .catch(error => {
        return error;
      });
  }

  /**
   * Store body.innerHTML as a backup into localStorage to be restored as user clicks on `Restore`
   * @returns {Promise<void>}
   */
  static async backupDOM() {
    return new Promise(async (resolve, reject) => {
      try {
        const alreadyAudited = await Common.getElement('.oxyplug-tech-seo');
        if (!alreadyAudited) {
          const body = await Common.getElement('body');

          // Store body backup into localStorage
          let backups = await Common.getLocalStorage('backups');
          if (backups) {
            backups[location.host] = body.innerHTML;
          } else {
            backups = {[location.host]: body.innerHTML};
          }
          await Common.setLocalStorage({backups});
          await chrome.runtime.sendMessage({log: 'Took a backup from the original body...'});
        }

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Start analyzing
   * @returns {Promise<{issues: (*|{count: {"height-issue": *, "next-gen-formats-issue": *, "lcp-issue": *, "alt-issue": *, "nx-issue": *, "width-issue": *, "src-issue": *, "rendered-size-issue": *, "aspect-ratio-issue": *, "load-fails-issue": *, "filesize-issue": *, "lazy-load-issue": *}, issues: (*|{})}|{})}>}
   */
  static async startAnalyzing() {
    return new Promise(async (resolve, reject) => {
      try {
        // Direction
        ContentScript.rtl = Boolean(await Common.getLocalStorage('rtl_scrolling'));

        // To reset, if already audited
        const alreadyAudited = await Common.getElement('.oxyplug-tech-seo');
        if (alreadyAudited) {
          await ContentScript.resetElements();
          await chrome.runtime.sendMessage({log: 'Previous elements reset...'});
        } else {
          await ContentScript.unsetDefaultScrollBehavior();
          await ContentScript.disableATags();
          await ContentScript.removeEventListeners();
          const imgs = await Common.getElements('img');
          await ContentScript.markLazies(imgs);
          if (ContentScript.lazyImgs.length) {
            // Scroll the page
            const result = await ContentScript.scrollPage();

            // Mark scrollables like carousels and scroll them to load lazy images
            if (result !== 'stopped') {
              await ContentScript.markScrollables();
              const result = await ContentScript.scrollScrollables();
              if (result !== 'stopped') {
                await ContentScript.waitForLazies();
              }
            }
          }
        }

        // Stopped
        const stopped = await ContentScript.checkStop();
        if (stopped) {
          await Common.setLocalStorage({is_processing: false, stopped: false});
          return resolve(stopped);
        }

        // The `imgs` needed to be declared twice since `removeEventListeners` method might destroy some images
        const imgs = await Common.getElements('img');
        ContentScript.issues = await Audit.all(imgs);

        // Add issues to storage
        let issues = await Common.getLocalStorage('issues');
        if (issues) {
          issues[location.host] = ContentScript.issues;
        } else {
          issues = {[location.host]: ContentScript.issues};
        }
        await Common.setLocalStorage({issues: issues});
        await Common.setLocalStorage({is_processing: false});

        // Send issues to popup
        await chrome.runtime.sendMessage({issues: ContentScript.issues});
      } catch (error) {
        console.log(error);
        await Common.setLocalStorage({is_processing: false, stopped: false});
        reject(error);
      }
    });
  }

  /**
   * Scroll to the point when clicked on each item in the issues list
   * @param request
   * @returns {Promise<void>}
   */
  static async scrollToPoint(request) {
    return new Promise(async (resolve, reject) => {
      try {
        // Target element
        const el = await Common.getElement(request.scrollTo);

        // Highlight the target element
        const highlights = await Common.getElements('.oxyplug-tech-seo-highlighted');
        let XColorAll = await Common.getLocalStorage('x_color_all');
        XColorAll = XColorAll ? XColorAll.toString() : '#0000ff';
        await highlights.forEach((highlight) => {
          highlight.classList.remove('oxyplug-tech-seo-highlighted');
          highlight.style.setProperty('color', XColorAll, 'important');
        });

        if (el) {
          const nextSibling = el.nextSibling;
          nextSibling.classList.add('oxyplug-tech-seo-highlighted');
          let XColor = await Common.getLocalStorage('x_color');
          XColor = XColor ? XColor.toString() : '#ff0000';
          nextSibling.style.setProperty('color', XColor, 'important');

          // Scroll to the target element point
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }

        // Store and show issues
        await chrome.runtime.sendMessage({showIssues: request.messages, issueTypes: request.issueTypes});

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Set X color
   * @param request
   * @returns {Promise<void>}
   */
  static async setXColor(request) {
    return new Promise(async (resolve, reject) => {
      try {
        const highlights = await Common.getElements('.oxyplug-tech-seo-highlighted');
        highlights.forEach((highlight) => {
          highlight.style.color = request.newXColor;
        });

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }

  /**
   * Set all X color
   * @param request
   * @returns {Promise<void>}
   */
  static async setXColorAll(request) {
    return new Promise(async (resolve, reject) => {
      try {
        const highlights = await Common.getElements('.oxyplug-tech-seo-highlight:not(.oxyplug-tech-seo-highlighted)');
        highlights.forEach((highlight) => {
          highlight.style.color = request.newXColorAll;
        });

        resolve();
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }
}

ContentScript.init()
  .then(() => {
    console.log('Content Script init');
  })
  .catch(() => {
    console.log('Content Script error');
  });