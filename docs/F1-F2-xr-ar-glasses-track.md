# F) XR/AR-Glasses Track (Vision Pro)

## Track 1 (MVP): Headset-Friendly Web Viewer

* **UI scaling & simplified controls:** Provide large UI buttons (> 10 mm target size), spacing between elements, and minimal modal dialogs. Use gaze-based focus and pinch selection as primary input. Avoid nested menus; provide radial or contextual menus.
* **Input assumptions:** According to WebKit's natural input model for visionOS, the user looks at a target and pinches to interact[20]. The default WebXR input is a transient pointer that exists only during the pinch, and events such as selectstart and selectend are fired on the XR session[21]. Design UI to respond to these events.
* **Fallback behaviour:** If WebXR is unavailable or disabled (visionOS requires enabling the feature in Safari's settings[22]), the viewer should operate as a 2D web app within the headset. Provide an overlay message guiding users to enable WebXR.
* **Performance considerations:** Aim for stable frame rates > 60 fps to avoid discomfort; reduce draw calls; limit transparent overlays. Test on Vision Pro Simulator and actual device.

## Track 2 (Stretch): Immersive WebXR Mode

* **Feasibility Analysis:** Evaluate whether xeokit's rendering pipeline can work inside WebXR sessions. Investigate integration with Three.js or Babylon.js to create an XR layer. Confirm that the engine supports offscreen rendering to XRWebGLLayer.
* **Minimal Prototype Plan:**
  * Enable WebXR flags in Safari and create a basic XR session that renders a simple glTF model using Three.js. Use the transient-pointer input mode to handle gaze-and-pinch[21].
  * Integrate xeokit model loading into this XR session; ensure camera controls map to natural input (e.g., teleport or navigation gestures). Use pointer raycasting for object selection.
  * Evaluate user comfort and interactions; adjust UI scale and event mapping.
* **Risks & Mitigations:**
  * Experimental support: WebXR on visionOS is behind a feature flag and may change; maintain fallbacks and monitor WebKit releases.
  * Performance constraints: Large models may not render smoothly; consider converting models to 3D tiles or using progressive LOD. Provide a model selection UI so users avoid loading huge models in immersive mode.
  * User comfort: Immersive experiences can cause fatigue or nausea; provide easy exit, teleportation, and avoid abrupt movement.
* **Alternative:** If direct integration is impractical, wrap the viewer in a native visionOS app that uses SceneKit/RealityKit to display converted models; call out to the web viewer via WKWebView for 2D/desktop use. This increases complexity but may provide better performance and native UI.
