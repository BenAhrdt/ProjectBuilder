export function buildContentDisposition(
    filename,
    disposition = "attachment"
) {
    const safeName = String(filename ?? "download")
        .replace(/[\\/:*?"<>|\u0000-\u001f\r\n]/g, "_")
        .trim()
        || "download";
    const fallbackName = safeName
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, "_");

    return `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}
