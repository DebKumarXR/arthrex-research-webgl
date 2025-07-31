import {
  DEFAULT_CONTROLS_SEPARATION,
  DEFAULT_EYE_ROTATION_SCALE,
  DEFAULT_PLANE_SIZE_SCALE,
  DEFAULT_ROTATION_RADIUS_SCALE,
  DEFAULT_TRANSLATION_DISTANCE_SCALE,
  IHandle,
  RotationGroup,
} from "./RotationControl";

import RotationControl from "./RotationControl";

import { Camera, Group, MathUtils, Mesh, Object3D, Quaternion, Vector3 } from "three";

export enum ANCHOR_MODE {
  /**
   * In this mode the Controls do not inherit the orientation of the object
   * as it is rotated.
   */
  FIXED = "fixed",
  /**
   * In this mode the Controls rotate as the object is rotated.
   */
  INHERIT = "inherit",
}

export enum DEFAULT_HANDLE_GROUP_NAME {
  /**
   * name for default translation handle along the +ve x-axis
   */
  XPT = "xpt_handle",
  /**
   * name for default translation handle along the +ve y-axis
   */
  YPT = "ypt_handle",
  /**
   * name for default translation handle along the +ve z-axis
   */
  ZPT = "zpt_handle",
  /**
   * name for default translation handle along the -ve x-axis
   */
  XNT = "xnt_handle",
  /**
   * name for default translation handle along the -ve y-axis
   */
  YNT = "ynt_handle",
  /**
   * name for default translation handle along the -ve z-axis
   */
  ZNT = "znt_handle",
  /**
   * name for default rotation handle along the x-axis
   */
  XR = "xr_handle",
  /**
   * name for default rotation handle along the y-axis
   */
  YR = "yr_handle",
  /**
   * name for default rotation handle along the z-axis
   */
  ZR = "zr_handle",
  /**
   * name for default rotation handle in the eye-plane
   */
  ER = "er_handle",
  /**
   * name for default translation handle in the eye-plane
   */
  PICK = "pick_handle",
  /**
   * name for default translation handle in the xy plane
   */
  PICK_PLANE_XY = "pick_plane_xy_handle",
  /**
   * name for default translation handle in the yz plane
   */
  PICK_PLANE_YZ = "pick_plane_yz_handle",
  /**
   * name for default translation handle in the zx plane
   */
  PICK_PLANE_ZX = "pick_plane_zx_handle",
}

export interface IControlsOptions {
  /**
   * the anchor mode for the controls
   * @default [[ANCHOR_MODE.FIXED]]
   */
  mode?: ANCHOR_MODE;
  /**
   * distance between the position of the object and the position of the
   * handles (in case of translation handles), or the radius (in case of rotation handles),
   * or the size of the plane (in case of plane handles)
   * @default 0.5
   */
  separation?: number;
  /**
   * uses THREE.Mesh.computeBounds to set the separation; if separation
   * is provided in addition to this option, it is added to the computed bounds
   * @default false
   */
  useComputedBounds?: boolean;
  /**
   * the quaternion applied to the whole Controls instance (handles get rotated relatively)
   * @default undefined
   */
  orientation?: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
  /**
   * hides other handles of a Controls instance when drag starts
   * @default true
   */
  hideOtherHandlesOnDrag?: boolean;
  /**
   *  hides all other Controls instances when drag starts
   *  @default true
   */
  hideOtherControlsInstancesOnDrag?: boolean;
  /**
   * displays the plane in which the drag interaction takes place
   * (useful for debugging)
   * @default false
   */
  showHelperPlane?: boolean;
  /**
   * enables damping for the controls
   * @default true
   */
  isDampingEnabled?: boolean;
  /**
   * sets the scaling factor for the radius of rotation handles
   * @default 1.0
   */
  rotationRadiusScale?: number;
  /**
   * sets the scaling factor for the radius of rotation handles in eye plane
   * @default 1.25
   */
  eyeRotationRadiusScale?: number;
  /**
   * sets the width and height scale for the pick plane handles
   * @default 0.75
   */
  pickPlaneSizeScale?: number;
  /**
   * sets the scaling for distance between translation handles' start and the
   * center of the controls
   * @default 1.0
   */
  translationDistanceScale?: number;
  /**
   * For translation handles: highlights the axis along which the object moves.
   * For rotation handles: highlights the axis of rotation.
   * Not available on other handles.
   * @default true
   */
  highlightAxis?: boolean;
  /**
   * Enables snap to grid (nearest integer coordinate) for all translation type handles:
   * [[TranslationGroup]], [[PickGroup]], and [[PickPlaneGroup]]
   * @default { x: false, y: false, z: false }
   */
  snapTranslation?: {
    x: boolean;
    y: boolean;
    z: boolean;
  };
}

/**
 * The first number is the unit limit allowed in the -ve direction.
 * The second number is the unit limit allowed in the +ve direction.
 *
 * All calculations are with respect to anchor position which is the object's
 * position when [[setTranslationLimit]] is called.
 * `{ x: [-1, 2], y: false, z: false }` - sets the translation limit to `-1` unit
 * in the -x-direction, `+2` units in the +x-direction, and no limit on the
 * y and z-direction.
 *
 * Setting the limit to `false` disables the limit in all directions.
 */
export interface TranslationLimit {
  x: [number, number] | false;
  y: [number, number] | false;
  z: [number, number] | false;
}

export interface IControlsOptions {
  /**
   * the anchor mode for the controls
   * @default [[ANCHOR_MODE.FIXED]]
   */
  mode?: ANCHOR_MODE;
  /**
   * distance between the position of the object and the position of the
   * handles (in case of translation handles), or the radius (in case of rotation handles),
   * or the size of the plane (in case of plane handles)
   * @default 0.5
   */
  separation?: number;
  /**
   * uses THREE.Mesh.computeBounds to set the separation; if separation
   * is provided in addition to this option, it is added to the computed bounds
   * @default false
   */
  useComputedBounds?: boolean;
  /**
   * the quaternion applied to the whole Controls instance (handles get rotated relatively)
   * @default undefined
   */
  orientation?: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
  /**
   * hides other handles of a Controls instance when drag starts
   * @default true
   */
  hideOtherHandlesOnDrag?: boolean;
  /**
   *  hides all other Controls instances when drag starts
   *  @default true
   */
  hideOtherControlsInstancesOnDrag?: boolean;
  /**
   * displays the plane in which the drag interaction takes place
   * (useful for debugging)
   * @default false
   */
  showHelperPlane?: boolean;
  /**
   * enables damping for the controls
   * @default true
   */
  isDampingEnabled?: boolean;
  /**
   * sets the scaling factor for the radius of rotation handles
   * @default 1.0
   */
  rotationRadiusScale?: number;
  /**
   * sets the scaling factor for the radius of rotation handles in eye plane
   * @default 1.25
   */
  eyeRotationRadiusScale?: number;
  /**
   * sets the width and height scale for the pick plane handles
   * @default 0.75
   */
  pickPlaneSizeScale?: number;
  /**
   * sets the scaling for distance between translation handles' start and the
   * center of the controls
   * @default 1.0
   */
  translationDistanceScale?: number;
  /**
   * For translation handles: highlights the axis along which the object moves.
   * For rotation handles: highlights the axis of rotation.
   * Not available on other handles.
   * @default true
   */
  highlightAxis?: boolean;
  /**
   * Enables snap to grid (nearest integer coordinate) for all translation type handles:
   * [[TranslationGroup]], [[PickGroup]], and [[PickPlaneGroup]]
   * @default { x: false, y: false, z: false }
   */
  snapTranslation?: {
    x: boolean;
    y: boolean;
    z: boolean;
  };
}

/**
 * Controls is the main class in this library.
 * It is a subclass of THREE.Group, so its properties like `position` and
 * `quaternion` can be modified as desired.
 * The `children` are the control handles (like `rotationX`).
 * All translations and rotations are setup with respect to the global coordinate system.
 * @noInheritDoc
 */
export default class Controls extends Group {
  
  /**
   * handle which rotates the object along the x-axis
   */
  public readonly rotationX: RotationControl;
  /**
   * handle which rotates the object along the y-axis
   */
  public readonly rotationY: RotationControl;
  /**
   * handle which rotates the object along the z-axis
   */
  public readonly rotationZ: RotationControl;
  /**
   * handle which rotates the object in the eye-plane
   */

  private handleTargetQuaternion = new Quaternion();
  private objectWorldPosition = new Vector3();
  private objectTargetPosition = new Vector3();
  private objectTargetQuaternion = new Quaternion();
  private objectParentWorldPosition = new Vector3();
  private objectParentWorldQuaternion = new Quaternion();
  private objectParentWorldScale = new Vector3();
  private deltaPosition = new Vector3();
  private normalizedHandleParallelVectorCache = new Vector3();
  private touch1 = new Vector3();
  private touch2 = new Vector3();
  private boundingSphereRadius = 0;
  private dragStartPoint = new Vector3();
  private dragIncrementalStartPoint = new Vector3();
  private handles: Set<IHandle> = new Set();
  private isBeingDraggedTranslation = false;
  private isBeingDraggedRotation = false;
  private dampingFactor = 0.8;
  private readonly useComputedBounds: boolean;
  private readonly separation: number;
  private initialSelfQuaternion = new Quaternion();
  private readonly minTranslationCache = new Vector3();
  private readonly maxTranslationCache = new Vector3();
  private readonly options: IControlsOptions;
  private readonly mode: ANCHOR_MODE;
  private readonly translationDistanceScale: number;
  private readonly rotationRadiusScale: number;
  private readonly eyeRotationRadiusScale: number;
  private readonly pickPlaneSizeScale: number;
  private translationLimit?: TranslationLimit | false = false;
  private translationAnchor: Vector3 | null = null;

  /**
   * enables damping for the controls
   * @default true
   */
  public isDampingEnabled: boolean;
  /**
   * hides other handles of a Controls instance when drag starts
   * @default true
   */
  public hideOtherHandlesOnDrag: boolean;
  /**
   *  hides all other Controls instances when drag starts
   *  @default true
   */
  public hideOtherControlsInstancesOnDrag: boolean;
  /**
   * displays the plane in which the drag interaction takes place
   * (useful for debugging)
   * @default false
   */
  public showHelperPlane: boolean;
  /**
   * For translation handles: highlights the axis along which the object moves.
   * For rotation handles: highlights the axis of rotation.
   * Not available on other handles.
   * @default true
   */
  public highlightAxis: boolean;
  /**
   * Enables snap to grid (nearest integer coordinate) for all translation type handles:
   * [[TranslationGroup]], [[PickGroup]], and [[PickPlaneGroup]]
   * @default { x: false, y: false, z: false }
   */
  public snapTranslation: {
    x: boolean;
    y: boolean;
    z: boolean;
  };

  public anchorRotation: Vector3;
  public anchorRotationUpdated: boolean;

   /**
   *
   * @param object - the object provided by the user
   * @param camera - the THREE.Camera instance used in the scene
   * @param options
   */
  constructor(public object: Object3D, private camera: Camera, options?: IControlsOptions) {
    super();

    this.options = options || {};
    this.mode = this.options?.mode ?? ANCHOR_MODE.FIXED;
    this.hideOtherHandlesOnDrag = this.options?.hideOtherHandlesOnDrag ?? true;
    this.hideOtherControlsInstancesOnDrag = this.options?.hideOtherControlsInstancesOnDrag ?? true;
    this.showHelperPlane = this.options?.showHelperPlane ?? false;
    this.highlightAxis = this.options?.highlightAxis ?? true;
    this.useComputedBounds = this.options?.useComputedBounds ?? false;
    this.snapTranslation = this.options?.snapTranslation ?? {
      x: false,
      y: false,
      z: false,
    };
    this.separation = this.options?.separation ?? DEFAULT_CONTROLS_SEPARATION;
    this.isDampingEnabled = this.options?.isDampingEnabled ?? true;
    this.rotationRadiusScale = this.options?.rotationRadiusScale ?? DEFAULT_ROTATION_RADIUS_SCALE;
    this.eyeRotationRadiusScale =
      this.options?.eyeRotationRadiusScale ?? DEFAULT_EYE_ROTATION_SCALE;
    this.pickPlaneSizeScale = this.options?.pickPlaneSizeScale ?? DEFAULT_PLANE_SIZE_SCALE;
    this.translationDistanceScale =
      this.options?.translationDistanceScale ?? DEFAULT_TRANSLATION_DISTANCE_SCALE;

    if (this.options.orientation !== undefined) {
      const { x, y, z, w } = this.options.orientation;
      this.initialSelfQuaternion.set(x, y, z, w).normalize();
      this.quaternion.copy(this.initialSelfQuaternion);
    }

    this.computeObjectBounds();

    this.rotationX = new RotationControl("red", this.boundingSphereRadius * this.rotationRadiusScale, Math.PI * 0, Math.PI * 0.4, false);
    this.rotationY = new RotationControl("green", this.boundingSphereRadius * this.rotationRadiusScale, Math.PI * 0.7, Math.PI * 1.1, true);
    this.rotationZ = new RotationControl("blue", this.boundingSphereRadius * this.rotationRadiusScale, Math.PI * 1.4, Math.PI * 1.8, true);

    this.rotationX.camera = this.camera;
    this.rotationY.camera = this.camera;
    this.rotationZ.camera = this.camera;

    //this.setupDefaultTranslation();
    this.setupDefaultRotation();
    //this.setupDefaultEyeRotation();
   // this.setupDefaultPickPlane();
    //this.setupDefaultPick();

    this.anchorRotation = new Vector3(0, 0, 0);
    this.anchorRotationUpdated = false;
  }

  private setupDefaultPickPlane = () => {
    
  };

  public setupHandle = (handle: IHandle) => {
    this.handles.add(handle);
    this.add(handle);
  };

  public isObjectRotationUpdated = () => {
    return this.anchorRotationUpdated;
  };

  public getObjectRotation = () => {
    this.anchorRotationUpdated = false;
    return this.anchorRotation;
  };

  public setObjectRotation = (rotation: Vector3) => {
    this.anchorRotation.copy(rotation);
  };


  private setupDefaultRotation = () => {
    this.rotationX.name = DEFAULT_HANDLE_GROUP_NAME.XR;
    this.rotationY.name = DEFAULT_HANDLE_GROUP_NAME.YR;
    this.rotationZ.name = DEFAULT_HANDLE_GROUP_NAME.ZR;

    this.rotationX.up = new Vector3(1, 0, 0);
    this.rotationY.up = new Vector3(0, 1, 0);
    this.rotationZ.up = new Vector3(0, 0, 1);

    this.rotationY.rotateX(Math.PI / 2);
    this.rotationX.rotateY(Math.PI / 2);
    this.rotationX.rotateZ(Math.PI);

    this.setupHandle(this.rotationX);
    this.setupHandle(this.rotationY);
    this.setupHandle(this.rotationZ);
  };

  private computeObjectBounds = () => {
    if (this.useComputedBounds) {
      if (this.object.type === "Mesh") {
        const geometry = (this.object as Mesh).geometry;
        geometry.computeBoundingSphere();
        const { boundingSphere } = geometry;
        const radius = boundingSphere?.radius ?? 0;
        this.boundingSphereRadius = radius / 2 + this.separation;
        return;
      } else {
        console.warn(
          `Bounds can only be computed for object of type THREE.Mesh,
          received object with type: ${this.object.type}. Falling back to using
          default separation.
        `
        );
      }
    }
    this.boundingSphereRadius = this.separation;
  };

  /**
   * Puts a limit on the object's translation anchored at the current position.
   *
   * `{ x: [-1, 2], y: false, z: false }` - sets the translation limit to `-1` unit
   * in the -x-direction, `+2` units in the +x-direction, and no limit on the
   * y and z-direction.
   *
   * Setting the limit to `false` disables the limit in all directions.
   * @param limit
   */
  public setTranslationLimit = (limit: TranslationLimit | false) => {
    this.translationLimit = limit;
    this.translationAnchor = limit ? this.position.clone() : null;
  };

  /**
   * @internal
   */
  processDragStart = (args: { point: Vector3; handle: IHandle }) => {
    const { point, handle } = args;
    this.dragStartPoint.copy(point);
    this.dragIncrementalStartPoint.copy(point);   
    this.isBeingDraggedRotation = handle instanceof RotationGroup;

    console.log("Drag started:", { point, handle });
  };

  /**
   * @internal
   */
  processDragEnd = (args: { handle: IHandle }) => {
    const { handle } = args;
    const { x: xSnap, y: ySnap, z: zSnap } = this.snapTranslation;
    const snap = [xSnap, ySnap, zSnap];

    this.isBeingDraggedTranslation = false;
    this.isBeingDraggedRotation = false;

    handle.resetHandlebarPosition();
    console.log("Drag ended:", { handle });
  };

  /**
   * Only takes effect if [[IControlsOptions.isDampingEnabled]] is true.
   * @param dampingFactor - value between 0 and 1, acts like a weight on the controls
   */
  public setDampingFactor = (dampingFactor = 0) =>
    (this.dampingFactor = MathUtils.clamp(dampingFactor, 0, 1));

  /**
   * @internal
   */
  processDrag = (args: { point: Vector3; handle: IHandle; dragRatio?: number }) => {
    const { point, handle, dragRatio = 1 } = args;
    const k = Math.exp(-this.dampingFactor * Math.abs(dragRatio ** 3));

    if(this.isBeingDraggedRotation)
    {
      this.touch1.copy(this.dragIncrementalStartPoint).sub(this.objectWorldPosition).normalize();

      this.touch2.copy(point).sub(this.objectWorldPosition).normalize();

      this.handleTargetQuaternion.setFromUnitVectors(this.touch1, this.touch2);
      if (this.mode === ANCHOR_MODE.FIXED) {
        this.detachHandleUpdateQuaternionAttach(handle, this.handleTargetQuaternion);
      }
      handle.updateHandleRotation(dragRatio);
      if(handle.name === DEFAULT_HANDLE_GROUP_NAME.XR) {
       this.anchorRotation.x += dragRatio * 0.01;
       this.anchorRotationUpdated = true;
      }
      else if(handle.name === DEFAULT_HANDLE_GROUP_NAME.YR) {
       this.anchorRotation.y += dragRatio * 0.01;
       this.anchorRotationUpdated = true;
      }
      if(handle.name === DEFAULT_HANDLE_GROUP_NAME.ZR) {
       this.anchorRotation.z += dragRatio * 0.01;
       this.anchorRotationUpdated = true;
      }
    }

    this.objectTargetQuaternion.premultiply(this.handleTargetQuaternion);
    this.dragIncrementalStartPoint.copy(point);
    //console.log("Drag in progress:", { point, handle });
  };

 

  private detachObjectUpdatePositionAttach = (parent: Object3D | null, object: Object3D) => {
    if (parent !== null && this.parent !== null && this.parent.parent !== null) {
      const scene = this.parent.parent;
      if (scene.type !== "Scene") {
        throw new Error("freeform controls must be attached to the scene");
      }
      scene.attach(object);
      object.position.copy(this.objectTargetPosition);
      parent.attach(object);
    }
  };

  private detachHandleUpdateQuaternionAttach = (handle: IHandle, quaternion: Quaternion) => {
    if (this.parent !== null && this.parent.parent) {
      const scene = this.parent.parent;
      if (scene.type !== "Scene") {
        throw new Error("freeform controls must be attached to the scene");
      }
      scene.attach(handle);
      handle.applyQuaternion(quaternion);
      this.attach(handle);
    }
  };

  /**
   * Applies supplied visibility to the supplied handle names.
   * Individual handle's visibility can also be changed by modifying the `visibility`
   * property on the handle directly.
   * @param handleNames
   * @param visibility
   */
  public showByNames = (
    handleNames: Array<DEFAULT_HANDLE_GROUP_NAME | string>,
    visibility = true
  ) => {
    const handleNamesMap: { [name: string]: IHandle | undefined } = {};
    this.handles.forEach((handle) => {
      handleNamesMap[handle.name] = handle;
    });
    handleNames.map((handleName) => {
      const handle = handleNamesMap[handleName];
      if (handle === undefined) {
        throw new Error(`handle: ${handleName} not found`);
      }
      handle.visible = visibility;
    });
  };

  /**
   * Applies supplied visibility to all handles
   * @param visibility
   */
  public showAll = (visibility = true) => {
    this.handles.forEach((handle) => {
      handle.visible = visibility;
    });
  };

  /**
   * @internal
   */
  public getInteractiveObjects(): Object3D[] {
    const interactiveObjects: Object3D[] = [];
    this.handles.forEach((handle) => {
      if (!handle.visible) {
        return;
      }
      interactiveObjects.push(...handle.getInteractiveObjects());
    });
    return interactiveObjects;
  }

  /**
   * @internal
   */
  updateMatrixWorld = (force?: boolean) => {
    this.object.updateMatrixWorld(force);

    this.object.getWorldPosition(this.objectWorldPosition);
    const parent = this.object.parent;
    if (parent !== null) {
      parent.matrixWorld.decompose(
        this.objectParentWorldPosition,
        this.objectParentWorldQuaternion,
        this.objectParentWorldScale
      );
    }
    this.objectParentWorldQuaternion.invert();
    this.objectTargetPosition.copy(this.position);
    this.objectTargetQuaternion.premultiply(this.objectParentWorldQuaternion);

    if (this.isBeingDraggedTranslation) {
      this.detachObjectUpdatePositionAttach(parent, this.object);
    } else if (this.isBeingDraggedRotation) {
      this.object.quaternion.copy(this.objectTargetQuaternion);
      this.detachObjectUpdatePositionAttach(parent, this.object);
    } else {
      this.position.copy(this.objectWorldPosition);
    }

    this.object.getWorldQuaternion(this.objectTargetQuaternion);
    if (this.mode === ANCHOR_MODE.INHERIT && !this.isBeingDraggedTranslation) {
      this.quaternion.copy(this.initialSelfQuaternion).premultiply(this.objectTargetQuaternion);
    }

    super.updateMatrixWorld(force);
  };
}

