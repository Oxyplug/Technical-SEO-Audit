class Common {
  /**
   *
   * @param modalId
   * @param openId
   * @returns {Promise<void>}
   */
  static async makeModalActions(modalId, openId = null) {
    const modal = document.getElementById(modalId);

    // Show
    if (openId) {
      const openButton = document.getElementById(openId);
      if (openButton) {
        openButton.onclick = () => {
          modal.style.display = 'block';
        }
      }
    }

    // Hide
    const closeButtons = document.querySelectorAll('#' + modalId + ' .oxyplug-modal-close');
    // Hide when click on button
    closeButtons.forEach((closeButton) => {
      closeButton.onclick = () => {
        modal.style.display = 'none';
      }
    });

    // Hide when click out of modal
    window.onclick = (event) => {
      if (event.target == modal) {
        modal.style.display = 'none';
      }
    }
  }

  /**
   *
   * @param modal
   * @returns {Promise<void>}
   */
  static async showModal(modal) {
    modal.style.display = 'block';
  }

  /**
   *
   * @param messages
   * @param issueTypes
   * @returns {Promise<void>}
   */
  static async showIssues(messages, issueTypes) {
    const oxyplugMessageId = 'oxyplug-modal-message';
    let messageModal = document.getElementById('oxyplug-modal-message');

    if (!messageModal) {
      const div = document.createElement('div');
      div.id = oxyplugMessageId;
      div.classList.add('oxyplug-modal');
      div.innerHTML =
        `<div class="oxyplug-modal-content">
          <span class="oxyplug-modal-close">&times;</span>
          <h1 class="oxyplug-tech-seo-h1">List of issues</h1>
          <ul></ul>
        </div>`;

      document.body.append(div);

      // Make modal actions
      // TODO: Remove this TODO! Decide if this line below makes different in popup and content or not!!!
      await Common.makeModalActions('oxyplug-modal-message');
    }

    messageModal = document.getElementById(oxyplugMessageId);
    const ul = messageModal.querySelector('.oxyplug-modal-content ul');
    ul.innerHTML = '';
    messages.forEach((message, index) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.classList.add('issue-number');

      if (Array.isArray(issueTypes) && issueTypes.length) {
        if (['nextGenFormatsIssue', 'lazyLoadIssue'].includes(issueTypes[index])) {
          span.classList.add('warning');
        } else if (issueTypes[index] === 'lcpIssue') {
          span.classList.add('info');
        }
      }

      span.innerText = index + 1;
      li.append(span, message);
      ul.append(li);
    });

    await Common.showModal(messageModal);
  }
}