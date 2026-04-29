(() => {
    const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
    const ALLOWED_CONTENT_TYPES = new Set([
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    ]);

    function getUploadPairs() {
        const pairs = [];
        const pairedInputIds = new Set();
        const configuredInputs = Array.from(
            document.querySelectorAll("[data-image-upload-input]")
        );

        configuredInputs.forEach((fileInput) => {
            if (!(fileInput instanceof HTMLInputElement) || !fileInput.id) {
                return;
            }

            const previewImage = document.querySelector(
                `[data-image-upload-preview="${fileInput.id}"]`
            );

            if (!(previewImage instanceof HTMLImageElement)) {
                return;
            }

            pairedInputIds.add(fileInput.id);
            pairs.push({ fileInput, previewImage });
        });

        const profileFileInput = document.getElementById("profile-image-upload");
        const profilePreviewImage = document.getElementById("profile-picture-preview");

        if (
            profileFileInput instanceof HTMLInputElement &&
            profilePreviewImage instanceof HTMLImageElement &&
            !pairedInputIds.has(profileFileInput.id)
        ) {
            pairs.push({
                fileInput: profileFileInput,
                previewImage: profilePreviewImage,
            });
        }

        return pairs;
    }

    const uploadPairs = getUploadPairs();
    if (uploadPairs.length === 0) return;

    const activeObjectUrls = new Map();

    function clearPreviewObjectUrl(fileInput) {
        const activeObjectUrl = activeObjectUrls.get(fileInput);
        if (!activeObjectUrl) return;

        URL.revokeObjectURL(activeObjectUrl);
        activeObjectUrls.delete(fileInput);
    }

    uploadPairs.forEach(({ fileInput, previewImage }) => {
        fileInput.addEventListener("change", () => {
            const selectedFile = fileInput.files && fileInput.files[0];
            if (!selectedFile) {
                return;
            }

            const normalizedType = (selectedFile.type || "").toLowerCase();
            if (!ALLOWED_CONTENT_TYPES.has(normalizedType)) {
                fileInput.value = "";
                return;
            }

            if (selectedFile.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
                fileInput.value = "";
                return;
            }

            clearPreviewObjectUrl(fileInput);
            const activeObjectUrl = URL.createObjectURL(selectedFile);
            activeObjectUrls.set(fileInput, activeObjectUrl);
            previewImage.src = activeObjectUrl;
        });
    });

    window.addEventListener("beforeunload", () => {
        uploadPairs.forEach(({ fileInput }) => {
            clearPreviewObjectUrl(fileInput);
        });
    });
})();
