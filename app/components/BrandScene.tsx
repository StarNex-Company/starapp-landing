"use client";

import { useEffect, useRef, useState } from "react";
import { sitePath } from "../../lib/site-paths";

type BrandSceneProps = {
  paused?: boolean;
};

/** A decorative sculpture of the supplied mark, with a usable non-WebGL fallback. */
export default function BrandScene({ paused = false }: BrandSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const refreshMotionRef = useRef<() => void>(() => undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
    refreshMotionRef.current();
  }, [paused]);

  useEffect(() => {
    const hostElement = hostRef.current;
    if (!hostElement) return;
    const host: HTMLDivElement = hostElement;

    let disposed = false;
    let failed = false;
    let frame = 0;
    let onScreen = true;
    let firstFrame = true;
    let lastTime = 0;
    let elapsed = 0;
    const controller = new AbortController();
    const cleanups: Array<() => void> = [];
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    };

    const fail = () => {
      if (disposed) return;
      failed = true;
      stop();
      setReady(false);
    };

    async function initialize() {
      try {
        const [THREE, { SVGLoader }, { RoomEnvironment }, source] =
          await Promise.all([
            import("three"),
            import("three/addons/loaders/SVGLoader.js"),
            import("three/addons/environments/RoomEnvironment.js"),
            fetch(sitePath("/assets/brand-mark.svg"), {
              signal: controller.signal,
            }).then((response) => {
              if (!response.ok) throw new Error("Brand asset unavailable");
              return response.text();
            }),
          ]);

        if (disposed) return;

        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
        cleanups.push(() => {
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
        });
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.22;
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.domElement.style.cssText =
          "display:block;width:100%;height:100%;outline:none";
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
        camera.position.set(0, 0.05, 7.6);
        camera.lookAt(0, 0.05, 0);

        cleanups.push(() => {
          scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.geometry.dispose();
            const materials = Array.isArray(object.material)
              ? object.material
              : [object.material];
            materials.forEach((material) => material.dispose());
          });
        });

        const room = new RoomEnvironment();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const environment = pmrem.fromScene(room, 0.045);
        scene.environment = environment.texture;
        room.dispose();
        pmrem.dispose();
        cleanups.push(() => environment.dispose());

        scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x163dc2, 2.1));
        const key = new THREE.DirectionalLight(0xffffff, 3.8);
        key.position.set(-3, 5, 6);
        scene.add(key);
        const edgeLight = new THREE.DirectionalLight(0xaecaff, 3);
        edgeLight.position.set(5, 1, -2);
        scene.add(edgeLight);
        const frontLight = new THREE.DirectionalLight(0xffffff, 1.1);
        frontLight.position.set(0, -2, 5);
        scene.add(frontLight);

        // Replace currentColor for SVGLoader; the fallback inherits the same blue.
        const parsed = new SVGLoader().parse(
          source.replaceAll("currentColor", "#1454ff"),
        );
        const shapes = parsed.paths.flatMap((path) =>
          SVGLoader.createShapes(path),
        );
        if (shapes.length === 0) throw new Error("Empty brand silhouette");

        const measuringGeometry = new THREE.ShapeGeometry(shapes);
        measuringGeometry.computeBoundingBox();
        const bounds = measuringGeometry.boundingBox;
        if (!bounds) {
          measuringGeometry.dispose();
          throw new Error("Invalid brand silhouette");
        }
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        measuringGeometry.dispose();
        const extent = Math.max(size.x, size.y);
        if (extent === 0) throw new Error("Invalid brand dimensions");

        const depth = extent * 0.105;
        const geometry = new THREE.ExtrudeGeometry(shapes, {
          depth,
          bevelEnabled: true,
          bevelThickness: extent * 0.014,
          bevelSize: extent * 0.012,
          bevelSegments: 5,
          curveSegments: 20,
          steps: 1,
        });
        geometry.translate(-center.x, -center.y, -depth / 2);

        const face = new THREE.MeshPhysicalMaterial({
          color: 0x0642ec,
          metalness: 0.64,
          roughness: 0.23,
          clearcoat: 1,
          clearcoatRoughness: 0.19,
          envMapIntensity: 1.15,
        });
        const side = new THREE.MeshPhysicalMaterial({
          color: 0x002cb6,
          metalness: 0.76,
          roughness: 0.26,
          clearcoat: 0.8,
          envMapIntensity: 1.1,
        });
        const sculpture = new THREE.Mesh(geometry, [face, side]);
        const scale = 3.28 / extent;
        sculpture.scale.set(scale, -scale, scale);
        const mark = new THREE.Group();
        mark.add(sculpture);
        mark.position.y = 0.12;
        mark.rotation.set(-0.1, -0.28, -0.11);
        scene.add(mark);

        const orbit = new THREE.Mesh(
          new THREE.TorusGeometry(1.97, 0.009, 6, 120),
          new THREE.MeshBasicMaterial({
            color: 0x678dff,
            transparent: true,
            opacity: 0.32,
            depthWrite: false,
          }),
        );
        orbit.rotation.set(1.12, -0.22, -0.3);
        orbit.position.set(0, -0.2, -0.55);
        scene.add(orbit);

        const pearl = new THREE.Mesh(
          new THREE.SphereGeometry(0.057, 16, 12),
          new THREE.MeshPhysicalMaterial({
            color: 0x2b65ff,
            metalness: 0.7,
            roughness: 0.2,
          }),
        );
        pearl.position.set(1.67, 0.47, 0.24);
        scene.add(pearl);

        let pointerX = 0;
        let pointerY = 0;
        let easedX = 0;
        let easedY = 0;

        const render = () => {
          if (disposed || failed) return;
          try {
            if (renderer.getContext().isContextLost()) {
              fail();
              return;
            }
            renderer.render(scene, camera);
            if (firstFrame) {
              firstFrame = false;
              setReady(true);
            }
          } catch {
            fail();
          }
        };

        const shouldAnimate = () =>
          !disposed &&
          !failed &&
          onScreen &&
          !document.hidden &&
          !motionQuery.matches &&
          !pausedRef.current;

        const animate = (time: number) => {
          frame = 0;
          if (!shouldAnimate()) {
            lastTime = 0;
            return;
          }
          const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
          lastTime = time;
          elapsed += delta;
          const easing = 1 - Math.exp(-delta * 3.6);
          easedX += (pointerX - easedX) * easing;
          easedY += (pointerY - easedY) * easing;

          mark.rotation.x = -0.1 + Math.sin(elapsed * 0.38) * 0.045 + easedY * 0.1;
          mark.rotation.y = -0.28 + Math.sin(elapsed * 0.31) * 0.14 + easedX * 0.2;
          mark.rotation.z = -0.11 + Math.sin(elapsed * 0.27) * 0.025;
          mark.position.y = 0.12 + Math.sin(elapsed * 0.68) * 0.072;
          orbit.rotation.z = -0.3 + Math.sin(elapsed * 0.2) * 0.075;
          pearl.position.y = 0.47 + Math.sin(elapsed * 0.52 + 1) * 0.1;
          render();
          if (shouldAnimate()) frame = window.requestAnimationFrame(animate);
        };

        const refreshMotion = () => {
          if (shouldAnimate()) {
            if (!frame) frame = window.requestAnimationFrame(animate);
          } else {
            stop();
          }
        };
        refreshMotionRef.current = refreshMotion;

        const resize = () => {
          const { width, height } = host.getBoundingClientRect();
          if (!width || !height || failed || disposed) return;
          const mobile = window.matchMedia("(max-width: 760px)").matches;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.position.z = Math.max(7.25, 7 / camera.aspect);
          camera.updateProjectionMatrix();
          render();
        };

        const movePointer = (event: PointerEvent) => {
          if (event.pointerType === "touch" || !shouldAnimate()) return;
          const rect = host.getBoundingClientRect();
          pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
          pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        };
        const resetPointer = () => {
          pointerX = 0;
          pointerY = 0;
        };
        host.addEventListener("pointermove", movePointer, { passive: true });
        host.addEventListener("pointerleave", resetPointer);
        cleanups.push(() => {
          host.removeEventListener("pointermove", movePointer);
          host.removeEventListener("pointerleave", resetPointer);
        });

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        cleanups.push(() => resizeObserver.disconnect());

        const intersectionObserver = new IntersectionObserver(
          ([entry]) => {
            onScreen = entry.isIntersecting;
            refreshMotion();
          },
          { threshold: 0.01 },
        );
        intersectionObserver.observe(host);
        cleanups.push(() => intersectionObserver.disconnect());

        document.addEventListener("visibilitychange", refreshMotion);
        motionQuery.addEventListener("change", refreshMotion);
        cleanups.push(() => {
          document.removeEventListener("visibilitychange", refreshMotion);
          motionQuery.removeEventListener("change", refreshMotion);
        });

        const contextLost = (event: Event) => {
          event.preventDefault();
          fail();
        };
        renderer.domElement.addEventListener("webglcontextlost", contextLost);
        cleanups.push(() =>
          renderer.domElement.removeEventListener("webglcontextlost", contextLost),
        );

        resize();
        refreshMotion();
      } catch {
        fail();
      }
    }

    void initialize();

    return () => {
      disposed = true;
      controller.abort();
      stop();
      refreshMotionRef.current = () => undefined;
      cleanups.reverse().forEach((cleanup) => cleanup());
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      data-brand-scene={ready ? "ready" : "fallback"}
      style={{ position: "absolute", inset: 0, isolation: "isolate" }}
    >
      <div
        style={{
          position: "absolute",
          width: "49%",
          height: "5%",
          left: "25%",
          bottom: "14%",
          borderRadius: "50%",
          background: "rgba(27, 69, 173, 0.18)",
          filter: "blur(18px)",
          transform: "rotate(-7deg)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          opacity: ready ? 0 : 1,
          pointerEvents: "none",
          color: "#1454ff",
        }}
      >
        {/* The original silhouette also works without JavaScript or WebGL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sitePath("/assets/brand-mark-blue.svg")}
          alt=""
          width="653"
          height="553"
          draggable={false}
          style={{
            width: "63%",
            height: "auto",
            maxHeight: "68%",
            objectFit: "contain",
            transform: "rotate(-7deg)",
            filter: "drop-shadow(10px 18px 16px rgba(20, 69, 179, 0.16))",
          }}
        />
      </div>
      <div
        ref={hostRef}
        style={{
          position: "absolute",
          inset: 0,
          opacity: ready ? 1 : 0,
        }}
      />
    </div>
  );
}
