const [milestone = "a future milestone", capability = "This command", ...args] =
  process.argv.slice(2);

console.error(
  "[M00] " +
    capability +
    " is not implemented yet; it is planned for " +
    milestone +
    ".",
);

if (args.length > 0) {
  console.error("[M00] Received arguments: " + args.join(" "));
}

process.exitCode = 1;
