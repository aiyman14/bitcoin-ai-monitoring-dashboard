import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "tableau-viz": {
        src: string;
        toolbar?: "top" | "bottom" | "hidden";
      };
    }
  }
}
