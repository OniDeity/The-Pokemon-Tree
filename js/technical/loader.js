// Load files

for (file in modInfo.modFiles) {
    let script = document.createElement("script");
    script.setAttribute("src", "js/" + modInfo.modFiles[file] + "?v=e8b7a6b");
    script.async = false; // Run in order: later files use earlier ones
    document.head.insertBefore(script, document.getElementById("temp"));
}

