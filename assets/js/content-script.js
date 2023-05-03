class Audit {
  static issueKey = 'oxyplug-tech-seo-issue-';
  static dontTryMore = [];
  static oxyplugLoadFails = [];
  static LCPs = [];

  /**
   * Add issues to an object
   * @param message
   * @param issueType
   * @param img
   * @returns {Promise<boolean>}
   */
  static async addToIssues(message, issueType, img) {
    const src = img.currentSrc;
    const imgComputedStyle = getComputedStyle(img);

    const i = img.dataset.oxyplug_tech_i;
    const issueKey = Audit.issueKey + i;
    const className = '.' + issueKey;
    if (Audit.issues[className]) {
      Audit.issues[className].messages.push(message);
      Audit.issues[className].issueTypes.push(issueType);
    } else {
      if (![...img.classList].includes(issueKey)) {
        img.classList.add(issueKey);
        let imgHeight = imgComputedStyle.height.replace(/px$/, '');
        if (imgHeight == 0) {
          imgHeight = img.clientHeight;
          if (imgHeight == 0 && img.parentElement) {
            imgHeight = img.parentElement.clientHeight;
          }
        }

        let imgWidth = imgComputedStyle.width.replace(/px$/, '');
        if (imgWidth == 0) {
          imgWidth = img.clientWidth;
          if (imgWidth == 0 && img.parentElement) {
            imgWidth = img.parentElement.clientWidth;
          }
        }

        // divX
        const divX = document.createElement('div');
        divX.classList.add('oxyplug-tech-seo');
        divX.dataset.width = imgWidth;
        divX.dataset.height = imgHeight;

        // spanX
        const spanX = document.createElement('span');
        spanX.innerText = 'X';
        spanX.classList.add('oxyplug-tech-seo-highlight');
        const left = Math.ceil(imgWidth / 2);
        const top = Math.ceil(imgHeight / 2);
        spanX.style.cssText = `left:${left}px;top:${top}px`;

        // Show issues
        spanX.addEventListener('click', async (e) => {
          e.preventDefault();
          const messages = Audit.issues[className] ? Audit.issues[className].messages : [];
          const issueTypes = Audit.issues[className] ? Audit.issues[className].issueTypes : [];
          await Common.showIssues(messages, issueTypes);
        });

        // Show "Click for more details..."
        spanX.addEventListener('mouseenter',() => {
          spanX.classList.add('hovered');
        });

        // Hide "Click for more details..."
        spanX.addEventListener('mouseleave',() => {
          spanX.classList.remove('hovered');
        });

        // Wrap img in a div
        divX.append(spanX);
        img.replaceWith(divX);
        divX.insertAdjacentElement('afterbegin', img);

        const spanComputedStyle = getComputedStyle(spanX);
        const spanFontSize = spanComputedStyle.fontSize;
        const fontSize = spanFontSize.replace(/px$/, '');
        const imgBigger = Math.min(parseInt(imgWidth), parseInt(imgHeight));
        if (fontSize > imgBigger) {
          spanX.style.fontSize = imgBigger + 'px';
        }
      }

      const url = (src && src.trim().length > 0) ? src : 'Without src attribute';
      Audit.issues[className] = {
        messages: [message],
        url: url,
        issueTypes: [issueType],
      };
    }

    return false;
  };

  /**
   * Audit elements with all validations
   * @param imgs
   * @returns {Promise<{count: {"height-issue": any, "next-gen-formats-issue": any, "lcp-issue": any, "alt-issue": any, "width-issue": any, "src-issue": any, "rendered-size-issue": any, "aspect-ratio-issue": any, "load-fails-issue": any, "filesize-issue": any, "lazy-load-issue": any}, issues: (*|{})}>}
   */
  static async all(imgs) {
    Audit.issues = {};
    Audit.oxyplugLoadFails = await getLocalStorage('oxyplug_load_fails');

    let [
      srcIssuesCount, altIssuesCount, widthIssuesCount,
      heightIssuesCount, renderedSizeIssuesCount,
      aspectRatioIssuesCount, filesizeIssuesCount,
      loadFailsIssuesCount, nextGenFormatsIssuesCount,
      lazyLoadIssuesCount, LCPsIssuesCount
    ] = Array(11).fill(0);

    let index = 1;

    const oxyplugTechSeoExclusions = await getLocalStorage('oxyplug_tech_seo_exclusions');
    for (let img of imgs) {

      let excluded = false;
      if (oxyplugTechSeoExclusions && oxyplugTechSeoExclusions[location.host]) {
        if (oxyplugTechSeoExclusions[location.host].indexOf(img.src) !== -1) {
          excluded = true;
        }
      }

      if (Audit.dontTryMore.indexOf(img) === -1 && excluded === false) {
        img.dataset.oxyplug_tech_i = index++;
        if (await Audit.src(img) === false) srcIssuesCount++;
        if (await Audit.alt(img) === false) altIssuesCount++;
        if (await Audit.width(img) === false) widthIssuesCount++;
        if (await Audit.height(img) === false) heightIssuesCount++;
        if (await Audit.renderedSize(img) === false) renderedSizeIssuesCount++;
        if (await Audit.aspectRatio(img) === false) aspectRatioIssuesCount++;
        if (await Audit.filesize(img) === false) filesizeIssuesCount++;
        if (await Audit.loadFails(img) === false) loadFailsIssuesCount++;
        if (await Audit.nextGenFormats(img) === false) nextGenFormatsIssuesCount++;
        if (await Audit.lazyLoad(img) === false) lazyLoadIssuesCount++;
        if (await Audit.LCP(img) === false) LCPsIssuesCount++;
      }
    }

    /**
     * By changing 1st image wrap, it would change the width and height of 2nd image wrap,
     * so what it got from 2nd image wrap was a wrong width/height.
     *
     * So the width/height stored in dataset in order not to destroy the other elements and
     * are being applied to the image wrap here.
     */
    const imgWraps = document.querySelectorAll('.oxyplug-tech-seo:not(.positioned)');
    for (const imgWrap of imgWraps) {
      const imgWidth = imgWrap.dataset.width;
      const imgHeight = imgWrap.dataset.height;
      imgWrap.classList.add('positioned');
      imgWrap.style.cssText = `position:relative;margin:auto;width:${imgWidth}px;height:${imgHeight}px`;
    }

    return {
      issues: Audit.issues,
      count: {
        'src-issue': srcIssuesCount,
        'alt-issue': altIssuesCount,
        'width-issue': widthIssuesCount,
        'height-issue': heightIssuesCount,
        'rendered-size-issue': renderedSizeIssuesCount,
        'aspect-ratio-issue': aspectRatioIssuesCount,
        'filesize-issue': filesizeIssuesCount,
        'load-fails-issue': loadFailsIssuesCount,
        'next-gen-formats-issue': nextGenFormatsIssuesCount,
        'lazy-load-issue': lazyLoadIssuesCount,
        'lcp-issue': LCPsIssuesCount,
      }
    };
  }

  // Validations Start
  /**
   * Audit src
   * @returns {Promise<boolean>}
   */
  static async src(img) {
    const issueType = 'srcIssue';
    if (!img.hasAttribute('src')) {
      return await Audit.addToIssues('Without src attribute!', issueType, img);
    } else if (img.getAttribute('src') === '') {
      return await Audit.addToIssues('The src attribute is empty!', issueType, img);
    }

    return true;
  };

  /**
   * Audit alt
   * @returns {Promise<boolean>}
   */
  static async alt(img) {
    const issueType = 'altIssue';
    if (!img.hasAttribute('alt')) {
      return await Audit.addToIssues('Without alt attribute!', issueType, img);
    } else {
      const imgAlt = img.getAttribute('alt').trim();
      const imgAltLength = imgAlt.length;
      const maxImageAlt = await getLocalStorage('oxyplug_max_image_alt'); // Length in characters
      if (imgAltLength === 0) {
        return await Audit.addToIssues('The alt attribute is empty!', issueType, img);
      } else if (imgAltLength > maxImageAlt) {
        return await Audit.addToIssues('The alt attribute length is more than ' + maxImageAlt + ' characters!', issueType, img);
      }
    }

    return true;
  };

  /**
   * Audit width
   * @returns {Promise<boolean>}
   */
  static async width(img) {
    const issueType = 'widthIssue';
    let hasHeightAndAspectRatio = false;
    if (img.hasAttribute('height') && img.getAttribute('height').trim() != '') {
      const imgComputedStyle = getComputedStyle(img);
      if (imgComputedStyle.aspectRatio !== 'auto') {
        hasHeightAndAspectRatio = true;
      }
    }

    if (hasHeightAndAspectRatio === false) {
      if (!img.hasAttribute('width')) {
        return await Audit.addToIssues('Without width attribute!', issueType, img);
      } else if (img.getAttribute('width').trim() === '') {
        return await Audit.addToIssues('The width attribute is empty!', issueType, img);
      }
    }

    return true;
  };

  /**
   * Audit height
   * @returns {Promise<boolean>}
   */
  static async height(img) {
    const issueType = 'heightIssue';

    let hasWidthAndAspectRatio = false;
    if (img.hasAttribute('width') && img.getAttribute('width').trim() != '') {
      const imgComputedStyle = getComputedStyle(img);
      if (imgComputedStyle.aspectRatio !== 'auto') {
        hasWidthAndAspectRatio = true;
      }
    }

    if (hasWidthAndAspectRatio === false) {
      if (!img.hasAttribute('height')) {
        return await Audit.addToIssues('Without height attribute!', issueType, img);
      } else if (img.getAttribute('height').trim() === '') {
        return await Audit.addToIssues('The height attribute is empty!', issueType, img);
      }
    }

    return true;
  };

  /**
   * Audit rendered size
   * @returns {Promise<boolean>}
   */
  static async renderedSize(img) {
    const checkSizes = async (imgNaturalWidth, imgNaturalHeight, newImg = undefined, img) => {
      const issueType = 'renderedSizeIssue';
      const tolerance = 1;
      img = newImg !== undefined ? newImg : img;
      const addedTolerance = {
        imgWidthMinus: img.width - tolerance,
        imgWidthPlus: img.width + tolerance,
        imgHeightMinus: img.height - tolerance,
        imgHeightPlus: img.height + tolerance,
      };

      if (
        imgNaturalWidth < addedTolerance.imgWidthMinus ||
        imgNaturalWidth > addedTolerance.imgWidthPlus ||
        imgNaturalHeight < addedTolerance.imgHeightMinus ||
        imgNaturalHeight > addedTolerance.imgHeightPlus
      ) {

        let message = 'The rendered image dimensions don\'t equal the original image dimensions! ';
        message += 'Rendered Dimensions: ' + img.width + 'x' + img.height;
        message += ' | Original Dimensions: ' + imgNaturalWidth + 'x' + imgNaturalHeight;

        return await Audit.addToIssues(message, issueType, img);
      }

      return true;
    };

    let imgNaturalWidth = img.naturalWidth;
    let imgNaturalHeight = img.naturalHeight;
    if (
      (imgNaturalWidth == 0 || imgNaturalHeight == 0) ||
      (imgNaturalWidth == 1 && imgNaturalHeight == 1)
    ) {
      // Create new img
      const newImg = document.createElement('img');

      // Wait for image to load
      newImg.srcset = img.srcset;
      newImg.src = img.src;
      try {
        await Audit.getImage(newImg);

        // Update width and height
        imgNaturalWidth = newImg.naturalWidth;
        imgNaturalHeight = newImg.naturalHeight;

        return await checkSizes(imgNaturalWidth, imgNaturalHeight, newImg, img);
      } catch (e) {
        Audit.dontTryMore.push(e.currentSrc);
        console.log('Failed to load image: ', e);
        console.dir(e);
      }
    } else {
      return await checkSizes(imgNaturalWidth, imgNaturalHeight, img);
    }

    return true;
  };

  /**
   * Audit aspect ratio
   * @returns {Promise<boolean>}
   */
  static async aspectRatio(img) {
    const issueType = 'aspectRatioIssue';
    const tolerance = 1;
    if (Math.abs((img.naturalWidth / img.naturalHeight) - (img.width / img.height)) > tolerance) {
      return await Audit.addToIssues('The aspect-ratio of the rendered image doesn\'t equal the aspect-ratio of the original image!', issueType, img);
    }

    return true;
  };

  /**
   * Audit filesize
   * @returns {Promise<boolean>}
   */
  static async filesize(img) {
    const issueType = 'filesizeIssue';
    if (img && img.currentSrc) {
      const maxImageFilesize = await getLocalStorage('oxyplug_max_image_filesize'); // KB
      const oxyplugImageFilesizes = await getLocalStorage('oxyplug_image_filesizes');
      if (oxyplugImageFilesizes && oxyplugImageFilesizes[img.currentSrc] && oxyplugImageFilesizes[img.currentSrc] > maxImageFilesize) {
        return await Audit.addToIssues('The image filesize is bigger than ' + maxImageFilesize + ' KB', issueType, img);
      }
    }

    return true;
  };

  /**
   * Audit images fails to load
   * @returns {Promise<boolean>}
   */
  static async loadFails(img) {
    const issueType = 'loadFailsIssue';
    if (img && img.currentSrc) {
      if (Audit.oxyplugLoadFails && Audit.oxyplugLoadFails[img.currentSrc]) {
        Audit.dontTryMore.push(img.currentSrc);
        const httpStatusCode = Audit.oxyplugLoadFails[img.currentSrc];
        return await Audit.addToIssues('The image fails to load with http status code of ' + httpStatusCode, issueType, img);
      }
    }

    return true;
  };

  static async nextGenFormats(img) {
    const issueType = 'nextGenFormatsIssue';
    let parent = img.parentElement;
    if (parent.tagName.toLowerCase() === 'div' && [...parent.classList].includes('oxyplug-tech-seo')) {
      parent = parent.parentElement;
    }
    if (parent.tagName.toLowerCase() === 'picture') {
      const nextGens = parent.querySelector('source[type="image/webp"], source[type="image/avif"]');
      if (nextGens) {
        return true;
      }
    }

    const extension = img.currentSrc.split('.').pop().toLowerCase();
    if (['wepb', 'avif'].includes(extension) || extension.length > 4) {
      return true;
    }

    return await Audit.addToIssues('The next-gen (WebP, AVIF) is not provided!', issueType, img);
  }

  static async lazyLoad(img) {
    if (!Audit.LCPs.includes(img) && await Audit.isOffscreen(img)) {
      const issueType = 'lazyLoadIssue';
      if (!img.hasAttribute('loading')) {
        return await Audit.addToIssues('The loading attribute is not set!', issueType, img);
      }

      if (img.getAttribute('loading').trim() !== 'lazy') {
        return await Audit.addToIssues('The loading attribute doesn\'t equal `lazy`!', issueType, img);
      }
    }

    return true;
  }

  static async LCP(img) {
    if (Audit.LCPs.length) {
      if (Audit.LCPs.includes(img)) {
        const issueType = 'lcpIssue';
        return await Audit.addToIssues('LCP', issueType, img);
      }
    }

    return true;
  }

  // Validations End

  static async isOffscreen(img) {
    const rect = img.getBoundingClientRect();
    return (
      (rect.x + rect.width) < 0 ||
      (rect.y + rect.height) < 0 ||
      (rect.x > window.innerWidth) ||
      (rect.y > window.innerHeight)
    );
  }

  static async fillLCPs() {
    Audit.LCPs = [];
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      Audit.LCPs.push(lastEntry.element);
    });
    observer.observe({
      type: 'largest-contentful-paint',
      buffered: true
    });
  }

  /**
   * Get image
   * @param imgElem
   * @returns {Promise<unknown>}
   */
  static async getImage(imgElem) {
    return new Promise((res, rej) => {
      if (imgElem.complete) {
        return res();
      }
      imgElem.onload = () => res();
      imgElem.onerror = () => rej(imgElem);
    });
  };
}

class ContentScript {
  static lazyImgs = [];
  static lazyTries = [];
  static scrollables = [];

  /**
   * Init
   * @returns {Promise<void>}
   */
  static async init() {
    await Audit.fillLCPs();
    ContentScript.issues = {};

    /*
    // TODO: Remove!
    const oxyplugTechSeoIssues = await getLocalStorage('oxyplug_tech_seo_issues');

    const currentPageUrl = new URL(location.href);
    const openedByOxyplug = currentPageUrl.searchParams.has('by-oxyplug-tech-seo');
    if (oxyplugTechSeoIssues && oxyplugTechSeoIssues[location.host] && openedByOxyplug === false) {
      delete oxyplugTechSeoIssues[location.host];
    }
    await chrome.storage.local.set({
      oxyplug_tech_seo_issues: oxyplugTechSeoIssues,
      oxyplug_started_once: false,
      oxyplug_active_url: null,
      oxyplug_active_filter: 'all-issue',
    });*/

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.oxyplugStart === true) {
        ContentScript.startAnalyzing();
      } else if (request.scrollTo) {
        ContentScript.scrollToPoint(request);
      } else if (request.newXColor) {
        ContentScript.setXColor(request);
      }

      sendResponse({status: true});
      return true;
    });
  }

  static async markLazies(imgs) {
    for (const [index, img] of Object.entries(imgs)) {
      if (
        (img.naturalWidth == 0 || img.naturalHeight == 0) ||
        (img.naturalWidth == 1 && img.naturalHeight == 1)
      ) {
        img.classList.add(`oxyplug-tech-seo-lazy-${index}`);
        ContentScript.lazyImgs.push(img);
        // TODO: Remove!
        console.log(img);
      }
    }
  }

  static async markScrollables() {
    const allElements = document.querySelectorAll('body *');
    for (let e = 0; e < allElements.length; e++) {
      const scrollableX = allElements[e].scrollTop > 0;
      const scrollableY = allElements[e].scrollLeft > 0;
      if (scrollableX || scrollableY) {
        if (scrollableX && scrollableY) {
          allElements[e].classList.add('oxyplug-tech-seo-scrollable-xy');
        } else if (scrollableX) {
          allElements[e].classList.add('oxyplug-tech-seo-scrollable-x');
        } else if (scrollableY) {
          allElements[e].classList.add('oxyplug-tech-seo-scrollable-y');
        }

        ContentScript.scrollables.push(allElements[e]);
      }
    }

    ContentScript.scrollables.reverse();
  }

  static async isInViewport(elem, callback, options = {}) {
      return new IntersectionObserver(entries => {
          entries.forEach(entry => callback(entry));
      }, options).observe(elem);
  }

  /**
   * Load lazy images by going down and up
   * @returns {Promise<void>}
   */
  static async downUp() {
    // TODO: Change intervals depending on how many images there are on the whole page
    let waitMore = true;
    const downUpInterval = 10; // TODO: 80
    const downUpStep = -100; // TODO: -20
    const waitSeconds = 1000;

    // Down
    let lastScrollY = -1;
    const downTimer = setInterval(async () => {
      lastScrollY = window.scrollY;
      window.scrollBy(0, Math.abs(downUpStep));

      if (lastScrollY == window.scrollY) {
        clearInterval(downTimer);

        // Load scrollables like carousels to load lazy images
        await ContentScript.markScrollables();

        // Up
        const upTimer = setInterval(() => {
          // Load lazy images inside scrollables by scrolling
          /*let scrollableFinished = false;
          requestIdleCallback(async () => {
            for (let s = 0; s < s < 5 && ContentScript.scrollables.length; s++) {
              const scrollable = ContentScript.scrollables[s];
              await ContentScript.isInViewport(scrollable, element => {
                if (element.isIntersecting) {
                  if ([...element.classList].includes('oxyplug-tech-seo-scrollable-xy')) {

                  }
                  delete ContentScript.scrollables[s];
                }
              }, {root: null, threshold: 1});
            }
            scrollableFinished = true;
          });*/

          // Scroll up the page
          if (true || scrollableFinished) {
            lastScrollY = window.scrollY;
            window.scrollBy(0, downUpStep);
            if (lastScrollY == window.scrollY) {
              clearInterval(upTimer);
              waitMore = false;
            }
          }

        }, downUpInterval);
      }
    }, downUpInterval);

    // Wait to reach bottom
    while (waitMore) {
      await new Promise(r => setTimeout(r, waitSeconds));
    }

    // TODO: Remove!
    /*window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
    await new Promise(r => setTimeout(r, 3000));
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });*/
  }

  static async waitForLazies() {
    let waitMore = false;
    ContentScript.lazyImgs.forEach((lazyImg, index) => {
      if (lazyImg.complete) {
        ContentScript.lazyImgs.splice(index, 1);
      } else {
        if (ContentScript.lazyTries[lazyImg.className] && ContentScript.lazyTries[lazyImg.className] >= 3) {
          ContentScript.lazyImgs.splice(index, 1);
        } else {
          if (lazyImg.naturalWidth > 1 && lazyImg.naturalHeight > 1) {
            ContentScript.lazyImgs.splice(index, 1);
          } else {
            waitMore = true;
            if (ContentScript.lazyTries[lazyImg.className]) {
              ContentScript.lazyTries[lazyImg.className] += 1;
            } else {
              ContentScript.lazyTries[lazyImg.className] = 1;
            }
          }
        }
      }
    });

    if (waitMore) {
      await new Promise(r => setTimeout(r, 3000));
      await ContentScript.waitForLazies();
    }
  }

  /**
   * Start analyzing
   * @returns {Promise<void>}
   */
  static async startAnalyzing() {
    document.querySelector('html, body').style.setProperty('scroll-behavior', 'unset', 'important');
    const imgs = document.querySelectorAll('img');
    await ContentScript.markLazies(imgs);
    if (ContentScript.lazyImgs.length) {
      await ContentScript.downUp();
      if (ContentScript.lazyImgs.length) {
        await ContentScript.waitForLazies();
      }
    }
    ContentScript.issues = await Audit.all(imgs);

    // Add issues to storage
    let oxyplugTechSeoIssues = await getLocalStorage('oxyplug_tech_seo_issues');
    if (oxyplugTechSeoIssues) {
      oxyplugTechSeoIssues[location.host] = ContentScript.issues;
    } else {
      oxyplugTechSeoIssues = {[location.host]: ContentScript.issues};
    }
    await chrome.storage.local.set({oxyplug_tech_seo_issues: oxyplugTechSeoIssues});

    // Send issues to popup
    await chrome.runtime.sendMessage({oxyplugTechSeoIssues: ContentScript.issues});
  }

  /**
   * Scroll to the point when clicked on each item in the issues list
   * @param request
   * @returns {Promise<void>}
   */
  static async scrollToPoint(request) {
    // Target element
    const el = await document.querySelector(request.scrollTo);

    // Highlight the target element
    const highlights = await document.querySelectorAll('.oxyplug-tech-seo-highlighted');
    await highlights.forEach((highlight) => {
      highlight.classList.remove('oxyplug-tech-seo-highlighted');
      highlight.style.setProperty('color', '#000000', 'important');
    });

    if (el) {
      const nextSibling = el.nextSibling;
      nextSibling.classList.add('oxyplug-tech-seo-highlighted');
      const color = await getLocalStorage('oxyplug_x_color');
      nextSibling.style.setProperty('color', color ? color.toString() : '#ff0000', 'important');

      // Scroll to the target element point
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }

    // Store and show issues
    await chrome.runtime.sendMessage({showIssues: request.messages, issueTypes: request.issueTypes});
  }

  /**
   * Set X color
   * @param request
   * @returns {Promise<void>}
   */
  static async setXColor(request) {
    const highlights = document.querySelectorAll('.oxyplug-tech-seo-highlighted');
    highlights.forEach((highlight) => {
      highlight.style.color = request.newXColor;
    });
  }
}

/**
 * Get local storage
 * @param key
 * @returns {Promise<unknown>}
 */
const getLocalStorage = async (key) => {
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

ContentScript.init().then(() => {
  //
});
