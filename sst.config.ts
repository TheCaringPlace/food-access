/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "food-access-points",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const site = new sst.aws.StaticSite("FoodAccessPoints", {
      ...($app.stage === "production" ? { domain: "food-access.thecaringplace.info" } : {}),
      build: {
        command: "pnpm run build",
        output: "dist",
      },
      edge: {
        viewerResponse: {
          injection: `
            var origin = event.request.headers.origin && event.request.headers.origin.value;
            if (
              origin === "http://freestorefoodbank.org" ||
              origin === "https://thecaringplace.info"
            ) {
              event.response.headers["access-control-allow-origin"] = { value: origin };
              event.response.headers.vary = { value: "Origin" };
            }
          `,
        },
      },
    });

    return { url: site.url };
  },
});
