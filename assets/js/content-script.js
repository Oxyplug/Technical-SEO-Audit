class Audit {
  static issueKey = 'oxyplug-tech-seo-issue-';
  static dontTryMore = [];
  static oxyplugLoadFails = [];
  static LCPs = [];

  static async preventPropagation(els) {
    const events = ['mousedown', 'mouseup', 'click'];
    els.forEach((el) => {
      events.forEach((event) => {
        el.addEventListener(event, (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });
    });
  }

  static async deactivateAnchors(spanX) {
    let isAffectedByAnchorTag = false;
    let closestAnchorTag = null;
    let currentElement = spanX.parentElement;
    while (currentElement && !isAffectedByAnchorTag) {
      if (currentElement.tagName === 'A') {
        isAffectedByAnchorTag = true;
        closestAnchorTag = currentElement;
      }

      currentElement = currentElement.parentElement;
    }
    if (closestAnchorTag) {
      closestAnchorTag.addEventListener('click', (event) => {
        event.preventDefault();
      });
    }
  }

  /**
   * Add issues to an object
   * @param message
   * @param issueType
   * @param img
   * @returns {Promise<boolean>}
   */
  static async addToIssues(message, issueType, img) {
    const src = img.currentSrc != '' ? img.currentSrc : img.src;
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
        let XColor = await getLocalStorage('oxyplug_x_color');
        XColor = XColor ? XColor.toString() : '#ff0000';
        let XColorAll = await getLocalStorage('oxyplug_x_color_all');
        XColorAll = XColorAll ? XColorAll.toString() : '#0000ff';
        spanX.style.setProperty('color', XColorAll, 'important');

        // Show issues
        spanX.addEventListener('click', async (e) => {
          e.preventDefault();

          // Highlight the target element
          const highlights = await document.querySelectorAll('.oxyplug-tech-seo-highlighted');
          await highlights.forEach((highlight) => {
            highlight.classList.remove('oxyplug-tech-seo-highlighted');
            highlight.style.setProperty('color', XColorAll, 'important');
          });
          spanX.classList.add('oxyplug-tech-seo-highlighted');
          spanX.style.setProperty('color', XColor, 'important');

          const messages = Audit.issues[className] ? Audit.issues[className].messages : [];
          const issueTypes = Audit.issues[className] ? Audit.issues[className].issueTypes : [];
          await Common.showIssues(messages, issueTypes);
        });

        // Wrap img in a div
        divX.append(spanX);
        img.replaceWith(divX);
        divX.insertAdjacentElement('afterbegin', img);

        // Prevent default actions including opening links in a new tab
        await Audit.preventPropagation([divX, img, spanX]);

        // Deactivate parent possible anchor tags
        await Audit.deactivateAnchors(spanX);

        // Set size of X equivalent to image size
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
   * @returns {Promise<{count: {"height-issue": any, "next-gen-formats-issue": any, "lcp-issue": any, "alt-issue": any, "nx-issue": any, "width-issue": any, "src-issue": any, "rendered-size-issue": any, "aspect-ratio-issue": any, "load-fails-issue": any, "filesize-issue": any, "lazy-load-issue": any}, issues: (*|{})}>}
   */
  static async all(imgs) {
    Audit.issues = {};
    Audit.LCPs = [];
    await window.scroll({top: 0});
    await Audit.fillLCPs();

    let [
      srcIssuesCount, altIssuesCount, widthIssuesCount,
      heightIssuesCount, renderedSizeIssuesCount,
      aspectRatioIssuesCount, filesizeIssuesCount,
      loadFailsIssuesCount, nxIssuesCount, nextGenFormatsIssuesCount,
      lazyLoadIssuesCount, LCPsIssuesCount
    ] = Array(12).fill(0);

    let index = 1;

    const oxyplugTechSeoExclusions = await getLocalStorage('oxyplug_tech_seo_exclusions');
    for (let img of imgs) {

      let excluded = false;
      if (oxyplugTechSeoExclusions && oxyplugTechSeoExclusions[location.host]) {
        const excludedImage = oxyplugTechSeoExclusions[location.host];
        if (excludedImage.indexOf(img.src) !== -1 || excludedImage.indexOf(img.currentSrc) !== -1) {
          excluded = true;
        }
      }

      // If the <img> is inside <picture> and has various densities/DPRs/dimensions,
      // it needs to replace the src with currentSrc in order not to load the other images that are for the other DPRs.
      // For example, when the loaded image is 300x300 with <source> but the <img> has the src of image 100x100.
      if (img.currentSrc != '') {
        img.src = img.currentSrc;
      }

      if (Audit.dontTryMore.indexOf(img.src) === -1 && excluded === false && img.clientHeight > 1 && img.clientWidth > 1) {
        img.dataset.oxyplug_tech_i = String(index++);
        if (await Audit.src(img) === false) srcIssuesCount++;
        if (await Audit.alt(img) === false) altIssuesCount++;
        if (await Audit.width(img) === false) widthIssuesCount++;
        if (await Audit.height(img) === false) heightIssuesCount++;
        if (await Audit.renderedSize(img) === false) renderedSizeIssuesCount++;
        if (await Audit.aspectRatio(img) === false) aspectRatioIssuesCount++;
        if (await Audit.filesize(img) === false) filesizeIssuesCount++;
        if (await Audit.loadFails(img) === false) loadFailsIssuesCount++;
        if (await Audit.nx(img) === false) nxIssuesCount++;
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
        'nx-issue': nxIssuesCount,
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
    const src = img.currentSrc != '' ? img.currentSrc : img.src;
    if (
      ((imgNaturalWidth == 0 || imgNaturalHeight == 0) || (imgNaturalWidth == 1 && imgNaturalHeight == 1)) &&
      !(Audit.oxyplugLoadFails && Audit.oxyplugLoadFails[src])
    ) {
      // Create new img
      const newImg = document.createElement('img');

      // Wait for image to load
      newImg.srcset = img.srcset;
      newImg.src = src;
      try {
        await Audit.getImage(newImg);

        // Update width and height
        imgNaturalWidth = newImg.naturalWidth;
        imgNaturalHeight = newImg.naturalHeight;

        return await checkSizes(imgNaturalWidth, imgNaturalHeight, newImg, img);
      } catch (e) {
        Audit.dontTryMore.push(e.currentSrc);
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
    if (img) {
      const src = img.currentSrc != '' ? img.currentSrc : img.src;
      const maxImageFilesize = await getLocalStorage('oxyplug_max_image_filesize'); // KB
      const oxyplugImageFilesizes = await getLocalStorage('oxyplug_image_filesizes');
      if (oxyplugImageFilesizes && oxyplugImageFilesizes[src] && oxyplugImageFilesizes[src] > maxImageFilesize) {
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
    if (img) {
      const src = img.currentSrc != '' ? img.currentSrc : img.src;
      if (Audit.oxyplugLoadFails && Audit.oxyplugLoadFails[src]) {
        Audit.dontTryMore.push(src);
        const httpStatusCode = Audit.oxyplugLoadFails[src];
        return await Audit.addToIssues('The image fails to load with http status code of ' + httpStatusCode, issueType, img);
      }
    }

    return true;
  };

  /**
   * Whether the image has image-2x
   *
   * @param img
   * @returns {Promise<boolean>}
   */
  static async nx(img) {
    const issueType = 'nxIssue';
    if (img) {
      const src = img.currentSrc != '' ? img.currentSrc : img.src;
      if (src.toLowerCase().endsWith('.svg')) {
        return true;
      }

      let has2x = false;
      let srcsets = null;

      // <picture srcset="...">
      const parentElement = img.parentElement;
      if (parentElement) {
        const grandParent = parentElement.parentElement;
        if (grandParent && grandParent.tagName === 'PICTURE') {
          const sources = grandParent.querySelectorAll('source');
          if (sources.length) {
            srcsets = sources[0].getAttribute('srcset');
          }
        }
      }

      // <img srcset="...">
      if (srcsets == null) {
        srcsets = img.getAttribute('srcset');
      }

      if (srcsets) {
        srcsets = srcsets.split(',').map(srcset => srcset.trim());
        has2x = srcsets.some(srcset => srcset.endsWith('2x'));
      }

      if (!has2x) {
        return await Audit.addToIssues('No 2x image found for DPR 2 devices!', issueType, img);
      }
    }

    return true;
  };

  static async nextGenFormats(img) {
    const src = img.currentSrc != '' ? img.currentSrc : img.src;
    if (src.toLowerCase().endsWith('.svg')) {
      return true;
    }

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

    const extension = src.split('.').pop().toLowerCase();
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
    let lcpElement = null;
    let lastWidth = 0;
    let lastHeight = 0;
    const elements = document.getElementsByTagName('img');
    for (let i = 0; i < elements.length && (elements[i].getBoundingClientRect().bottom / 2) < window.innerHeight; i++) {
      const element = elements[i];
      if (element.offsetWidth > lastWidth && element.offsetHeight > lastHeight) {
        lastWidth = element.offsetWidth;
        lastHeight = element.offsetHeight;
        lcpElement = element;
      }
    }

    if (lcpElement) {
      Audit.LCPs.push(lcpElement);
    }
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
  static scrollableIndex = 0;
  static rtl = false;

  /**
   * Init
   * @returns {Promise<void>}
   */
  static async init() {
    ContentScript.issues = {};
    Audit.oxyplugLoadFails = await getLocalStorage('oxyplug_load_fails');
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.oxyplugStart === true) {
        ContentScript.startAnalyzing();
      } else if (request.scrollTo) {
        ContentScript.scrollToPoint(request);
      } else if (request.newXColor) {
        ContentScript.setXColor(request);
      } else if (request.newXColorAll) {
        ContentScript.setXColorAll(request);
      }

      sendResponse({status: true});
      return true;
    });
  }

  static async markLazies(imgs) {
    for (const [index, img] of Object.entries(imgs)) {
      const src = img.currentSrc != '' ? img.currentSrc : img.src;
      if (
        ((img.naturalWidth == 0 || img.naturalHeight == 0) || (img.naturalWidth == 1 && img.naturalHeight == 1)) &&
        !(Audit.oxyplugLoadFails && Audit.oxyplugLoadFails[src])
      ) {
        img.setAttribute('loading', 'eager');
        img.classList.add(`oxyplug-tech-seo-lazy-${index}`);
        ContentScript.lazyImgs.push(img);
      }
    }
  }

  static async markScrollables() {
    const allElements = document.querySelectorAll('body *:not(script, style, link, meta)');
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
  }

  /**
   * Load lazy images by scrolling the page
   * @returns {Promise<void>}
   */
  static async scrollPage() {
    const docEl = document.documentElement;

    // Go to top to start scrolling
    await window.scroll({top: 0});

    // Down
    const scrollForwardVertically = async () => {
      const shouldContinue = docEl.clientHeight + docEl.scrollTop < docEl.scrollHeight - 1;
      if (shouldContinue) {

        // Scroll Down
        window.scrollTo({
          top: docEl.scrollTop + docEl.clientHeight,
          behavior: 'smooth'
        });

        // Wait 0.7 second
        await new Promise(resolve => {
          setTimeout(() => {
            resolve()
          }, 700);
        });

        // Call function again
        await scrollForwardVertically();
      } else {
        await scrollBackwardVertically();
      }
    };

    // Up
    const scrollBackwardVertically = async () => {
      const shouldContinue = docEl.scrollTop > 1;
      if (shouldContinue) {

        // Scroll Up
        window.scrollTo({
          top: docEl.scrollTop - docEl.clientHeight,
          behavior: 'smooth'
        });

        // Wait 0.7 second
        await new Promise(resolve => {
          setTimeout(() => {
            resolve()
          }, 700);
        });

        // Call function again
        await scrollBackwardVertically();
      }
    };

    // Start scrolling
    await scrollForwardVertically();
  }

  static async gotoSection(scrollable) {
    if (scrollable.dataset.rectTop) {
      scrollable.parentElement.scroll({
        top: Number(scrollable.dataset.rectTop),
        behavior: 'smooth'
      });
    } else {
      const scrollableY = scrollable.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, scrollableY);
    }
  }

  static async moreScrollables() {
    if (ContentScript.scrollables.length) {
      const nextScrollable = ContentScript.scrollables[++ContentScript.scrollableIndex];
      if (nextScrollable === undefined) {
        ContentScript.scrollables = [];
      } else {
        await ContentScript.gotoSection(nextScrollable);
        await ContentScript.initScroll(nextScrollable);
      }
    }
  }

  static async scrollHorizontally(scrollable) {
    const scrollForwardHorizontally = async (scrollable, scrollEndPoint) => {
      if (ContentScript.rtl) {
        if (Math.abs(scrollable.scrollLeft) < scrollEndPoint) {

          // Scroll Forward
          scrollable.scrollTo({
            left: scrollable.scrollLeft - scrollable.clientWidth,
            behavior: 'smooth'
          });

          // Wait 0.7 second
          await new Promise(resolve => {
            setTimeout(() => {
              resolve()
            }, 700);
          });

          // Call function again
          await scrollForwardHorizontally(scrollable, scrollEndPoint);
        }
      } else {
        if (scrollable.scrollLeft < scrollEndPoint) {

          // Scroll Forward
          scrollable.scrollTo({
            left: scrollable.scrollLeft + scrollable.clientWidth,
            behavior: 'smooth'
          });

          // Wait 0.7 second
          await new Promise(resolve => {
            setTimeout(() => {
              resolve()
            }, 700);
          });

          // Call function again
          await scrollForwardHorizontally(scrollable, scrollEndPoint);
        }
      }

      await scrollBackwardHorizontally(scrollable, 0);
    }
    const scrollBackwardHorizontally = async (scrollable, scrollEndPoint) => {
      if (ContentScript.rtl) {
        if (scrollable.scrollLeft < scrollEndPoint) {

          // Scroll Backward
          scrollable.scrollTo({
            left: scrollable.scrollLeft + scrollable.clientWidth,
            behavior: 'smooth'
          });

          // Wait 0.7 second
          await new Promise(resolve => {
            setTimeout(() => {
              resolve()
            }, 700);
          });

          // Call function again
          await scrollBackwardHorizontally(scrollable, scrollEndPoint);
        }
      } else {
        if (scrollable.scrollLeft > scrollEndPoint) {

          // Scroll Backward
          scrollable.scrollTo({
            left: scrollable.scrollLeft - scrollable.clientWidth,
            behavior: 'smooth'
          });

          // Wait 0.7 second
          await new Promise(resolve => {
            setTimeout(() => {
              resolve()
            }, 700);
          });

          // Call function again
          await scrollBackwardHorizontally(scrollable, scrollEndPoint);
        }
      }

      await ContentScript.moreScrollables();
    }

    await ContentScript.gotoSection(scrollable);

    const scrollEndPointWithTolerance = scrollable.scrollWidth - scrollable.clientWidth - 1;
    // Scroll to the start point depending on the layout
    scrollable.scrollLeft = ContentScript.rtl ? scrollEndPointWithTolerance : 0;
    await scrollForwardHorizontally(scrollable, scrollEndPointWithTolerance);
  }

  static async scrollVertically(scrollable) {
    const scrollForwardVertically = async (scrollable, scrollEndPoint) => {
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
        await new Promise(resolve => {
          setTimeout(() => {
            resolve()
          }, 700);
        });

        // Call function again
        await scrollForwardVertically(scrollable, scrollEndPoint);
      }

      await scrollBackwardVertically(scrollable, 0);
    }
    const scrollBackwardVertically = async (scrollable, scrollEndPoint) => {
      if (scrollable.scrollTop > scrollEndPoint) {

        // Scroll Backward
        scrollable.scrollTo({
          top: scrollable.scrollTop - scrollable.clientHeight,
          behavior: 'smooth'
        });

        // Wait 0.7 second
        await new Promise(resolve => {
          setTimeout(() => {
            resolve()
          }, 700);
        });

        // Call function again
        await scrollBackwardVertically(scrollable, scrollEndPoint);
      }

      await ContentScript.moreScrollables();
    }

    const scrollEndPointWithTolerance = scrollable.scrollHeight - scrollable.clientHeight - 1;
    // Scroll to the start point
    scrollable.scrollTop = 0;
    await scrollForwardVertically(scrollable, scrollEndPointWithTolerance);
  }

  static async initScroll(scrollable) {
    const classList = [...scrollable.classList];
    if (classList.includes('oxyplug-tech-seo-scrollable-x')) {
      await ContentScript.scrollHorizontally(scrollable);
    } else if (classList.includes('oxyplug-tech-seo-scrollable-y')) {
      await ContentScript.scrollVertically(scrollable);
    }
  }

  /**
   * Load lazy images by scrolling scrollable sections
   * @returns {Promise<void>}
   */
  static async scrollScrollables() {
    return new Promise(resolve => {
      // Iterate over scrollables to scroll
      ContentScript.scrollableIndex = 0;
      const scrollable = ContentScript.scrollables[ContentScript.scrollableIndex];
      if (scrollable) {
        (async () => {
          await ContentScript.initScroll(scrollable)
        })();
      }

      const checkAllScrolled = setInterval(() => {
        if (ContentScript.scrollables.length === 0) {
          // Resolve the promise when all the scrolling has been completed
          clearInterval(checkAllScrolled);
          resolve();
        }
      }, 1000)
    });
  }

  static async waitForLazies() {
    return new Promise(resolve => {
      const checkImagesLoaded = setInterval(() => {
        if (ContentScript.lazyImgs.length === 0) {
          clearInterval(checkImagesLoaded);
          resolve();
        } else {
          for (let i = ContentScript.lazyImgs.length - 1; i >= 0; i--) {
            const lazyImg = ContentScript.lazyImgs[i];
            const className = lazyImg.className;

            // Check if it is loaded, to remove it from the array
            lazyImg.addEventListener('load', function () {
              if (lazyImg.complete) {
                ContentScript.lazyImgs.splice(i, 1);
              }
            });

            // If it hasn't been loaded for the third time, ignore it
            if (ContentScript.lazyTries[className] && ContentScript.lazyTries[className] >= 3) {
              ContentScript.lazyImgs.splice(i, 1);
            } else {
              ContentScript.lazyTries[className] = ContentScript.lazyTries[className] ? ContentScript.lazyTries[className] + 1 : 1;
            }
          }
        }
      }, 1000);
    });
  }

  /**
   * Start analyzing
   * @returns {Promise<void>}
   */
  static async startAnalyzing() {
    ContentScript.rtl = Boolean(await getLocalStorage('oxyplug_rtl_scrolling'));
    document.querySelector('html, body').style.setProperty('scroll-behavior', 'unset', 'important');
    const imgs = document.querySelectorAll('img');
    await ContentScript.markLazies(imgs);
    if (ContentScript.lazyImgs.length) {
      // Scroll the page
      await ContentScript.scrollPage();

      // Mark scrollables like carousels and scroll them to load lazy images
      await ContentScript.markScrollables();
      await ContentScript.scrollScrollables();
      await ContentScript.waitForLazies();
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
    let XColorAll = await getLocalStorage('oxyplug_x_color_all');
    XColorAll = XColorAll ? XColorAll.toString() : '#0000ff';
    await highlights.forEach((highlight) => {
      highlight.classList.remove('oxyplug-tech-seo-highlighted');
      highlight.style.setProperty('color', XColorAll, 'important');
    });

    if (el) {
      const nextSibling = el.nextSibling;
      nextSibling.classList.add('oxyplug-tech-seo-highlighted');
      let XColor = await getLocalStorage('oxyplug_x_color');
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

  /**
   * Set all X color
   * @param request
   * @returns {Promise<void>}
   */
  static async setXColorAll(request) {
    const highlights = document.querySelectorAll('.oxyplug-tech-seo-highlight:not(.oxyplug-tech-seo-highlighted)');
    highlights.forEach((highlight) => {
      highlight.style.color = request.newXColorAll;
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
