(() => {
  const bellOutlineIcon = document.getElementById("bell-icon-outline");
  const bellFilledIcon = document.getElementById("bell-icon-filled");
  const notificationsTrigger = document.getElementById("notifications-trigger");
  const bellNotificationAlert = document.getElementById("bell-notification-alert");
  let hasUnreadMessages = notificationsTrigger?.dataset.hasUnreadMessages === "true";

  function wireTopDropdownInteractions() {
    const dropdownEntries = Array.from(
      document.querySelectorAll(".top-icon-trigger[aria-controls]")
    )
      .map((triggerElement) => {
        const panelId = triggerElement.getAttribute("aria-controls");
        if (!panelId) return null;
        const panelElement = document.getElementById(panelId);
        if (!panelElement) return null;
        return {
          panelElement,
          panelId,
          triggerElement,
          isOpen: false
        };
      })
      .filter(Boolean);

    const notificationsEntry = dropdownEntries.find(
      (entry) => entry.panelId === "notifications-panel"
    );

    function setBellIconState(open) {
      if (!bellOutlineIcon || !bellFilledIcon) return;
      const shouldShowFilledIcon = open || hasUnreadMessages;
      bellOutlineIcon.classList.toggle("d-none", shouldShowFilledIcon);
      bellFilledIcon.classList.toggle("d-none", !shouldShowFilledIcon);

      if (bellNotificationAlert) {
        bellNotificationAlert.classList.toggle("d-none", !hasUnreadMessages);
      }
    }

    function closeEntry(entry) {
      if (!entry) return;
      entry.isOpen = false;
      entry.panelElement.classList.remove("is-open");
      entry.panelElement.setAttribute("aria-hidden", "true");
      entry.triggerElement.setAttribute("aria-expanded", "false");
      entry.triggerElement.classList.remove("is-active");

      if (entry === notificationsEntry) {
        setBellIconState(false);
      }
    }

    function closeAll(exceptEntry = null) {
      dropdownEntries.forEach((entry) => {
        if (entry !== exceptEntry) {
          closeEntry(entry);
        }
      });
    }

    function openEntry(entry) {
      if (!entry || entry.isOpen) return;

      closeAll(entry);
      entry.isOpen = true;
      entry.panelElement.classList.add("is-open");
      entry.panelElement.setAttribute("aria-hidden", "false");
      entry.triggerElement.setAttribute("aria-expanded", "true");
      entry.triggerElement.classList.add("is-active");

      if (entry === notificationsEntry) {
        setBellIconState(true);
      }
    }

    function toggleEntry(entry) {
      if (!entry) return;

      if (entry.isOpen) {
        closeEntry(entry);
        return;
      }

      openEntry(entry);
    }

    dropdownEntries.forEach((entry) => {
      entry.triggerElement.addEventListener("click", (event) => {
        event.preventDefault();
        toggleEntry(entry);
      });

      entry.triggerElement.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleEntry(entry);
        }
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeAll();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      dropdownEntries.forEach((entry) => {
        if (!entry.isOpen) return;
        if (
          entry.panelElement.contains(target) ||
          entry.triggerElement.contains(target)
        ) {
          return;
        }

        closeEntry(entry);
      });
    });

    closeAll();
    setBellIconState(false);
  }

  wireTopDropdownInteractions();
})();
