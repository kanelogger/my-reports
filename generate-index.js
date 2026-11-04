/* Build the three archives, then package only public site files. */
const { generateIndexes } = require("./lib/indexes");
const { packageSite } = require("./lib/site");
generateIndexes();
packageSite();
