import { BufferGeometry,OctahedronGeometry, Float32BufferAttribute, MeshBasicMaterial, Camera, Quaternion, LineBasicMaterial, TorusGeometry, Sphere, SphereGeometry } from "three";
import { Group, Mesh, Vector3, DoubleSide, Line } from "three";

export const DEFAULT_LINE_HEIGHT = 1;
export const DEFAULT_RADIAL_SEGMENTS = 32;

export const DEFAULT_CONE_HEIGHT = 0.75;
export const DEFAULT_CONE_RADIUS = 0.3;

export const DEFAULT_OCTAHEDRON_RADIUS = 0.2;

export const DEFAULT_PLANE_WIDTH = 0.75;
export const DEFAULT_PLANE_HEIGHT = 0.75;
export const DEFAULT_PLANE_SEGMENTS = 32;

export const DEFAULT_RING_NUM_POINTS = 64;
export const DEFAULT_RING_RADIUS = 1;

export enum PICK_PLANE_OPACITY {
  ACTIVE = 0.75,
  INACTIVE = 0.3,
}

export const DEFAULT_CONTROLS_SEPARATION = 1;
export const DEFAULT_ROTATION_RADIUS_SCALE = 3;
export const DEFAULT_EYE_ROTATION_SCALE = 1.25;
export const DEFAULT_PLANE_SIZE_SCALE = 0.75;
export const DEFAULT_TRANSLATION_DISTANCE_SCALE = 1;

export const DEFAULT_COLOR_ARROW = "#f0ff00";
export const DEFAULT_COLOR_RING = "#f0ff00";
export const DEFAULT_COLOR_PLANE = "#f0ff00";
export const DEFAULT_CONTROLS_OPACITY = 1;



export abstract class HandleGroup extends Group {
  /**
   * returns an array of all the interactive objects that form a handle;
   * note that a handle can have non-interactive objects as well.
   */
  public abstract getInteractiveObjects(): Mesh[];

  /**
   * sets the color for the handle; this may involve setting colors for multiple
   * constituent meshes that form the handle (interactive or non-interactive)
   * @param color - hex code for the color
   */
  public abstract setColor(color: string): void;
}

export abstract class RotationGroup extends HandleGroup {
  /**
   * This is a unit vector that runs along the axis of the rotation handles.
   * For example, in case of [[Controls.rotationX]], it is
   * `THREE.Vector3(1,0,0)` (along the x-axis).
   */
  public up = new Vector3();
}

export class Octahedron extends Mesh {
  constructor(color: string) {
    super();
    //this.geometry = new OctahedronGeometry(DEFAULT_OCTAHEDRON_RADIUS, 0);
    this.geometry = new SphereGeometry(DEFAULT_OCTAHEDRON_RADIUS, 8, 8);
    this.material = new MeshBasicMaterial({
      color,
      depthTest: false,
      transparent: true,
      side: DoubleSide,
    });
  }
}

export class CLine extends Line {
  constructor(color: string, geometry: BufferGeometry) {
    super();
    this.geometry = geometry;   
    
    this.material = new MeshBasicMaterial({ color, depthTest: true });
    this.material.transparent = true;
    this.material.opacity = DEFAULT_CONTROLS_OPACITY;
  }
}

export type IHandle = RotationGroup;


export default class RotationControl extends RotationGroup {
  //private readonly ring: CLine;
  private readonly ring: Mesh;
  private readonly handlebar: Octahedron;

  constructor(color = DEFAULT_COLOR_RING, ringRadius = DEFAULT_RING_RADIUS, startAngle = Math.PI / 2, endAngle = Math.PI) {
    super();
    // const ringNumberOfPoints = DEFAULT_RING_NUM_POINTS;
    // const ringGeometry = new BufferGeometry();
    // const segments = ringNumberOfPoints;

    // const vertices = [];
    // for (let i = 0; i <= segments; i++) {
    //     const t = i / segments;
    //     const angle = startAngle + t * (endAngle - startAngle);
    //     vertices.push(ringRadius * Math.cos(angle), ringRadius * Math.sin(angle), 0 );
    // }

    //ringGeometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    //this.ring = new CLine(color, ringGeometry);
    // this.add(this.ring);
    this.handlebar = new Octahedron(color);
    this.handlebar.position.y = ringRadius; 
    this.handlebar.renderOrder = 1;

    const pivotPoint = this.position; // Your central point
    const radius = ringRadius; // Distance from the pivot
    const angle = startAngle + (endAngle - startAngle) / 2;//Math.PI / 4; // Angle in radians (e.g., 45 degrees)

    const x = pivotPoint.x + radius * Math.cos(endAngle);
    const y = pivotPoint.y + radius * Math.sin(endAngle);
    // If you are using the XY plane, use 'y' instead of 'z' for the second coordinate
    // const y = pivotPoint.y + radius * Math.sin(angle);

    this.handlebar.position.set(x, y, pivotPoint.z);    
    this.add(this.handlebar);


    //Ring geometry
     const matRed = new MeshBasicMaterial( {
			depthTest: false,
			depthWrite: false,
			fog: false,
			toneMapped: false,
			transparent: true,
      //color: color,
      opacity: 0.5,
		} );	
   
    const geometry = new TorusGeometry(ringRadius, 0.05, 3, 64, Math.PI * 0.4);
    this.ring = new Mesh(geometry, matRed);
    this.add(this.ring);

    //rotate the ring 45 degrees around the z-axis
    this.ring.rotation.set(0, 0, angle);
  }

  /**
   * @internal
   */
  public getInteractiveObjects = () => {
    return [this.handlebar];
  };

  public setColor = (color: string) => {
    const ringMaterial = this.ring.material as MeshBasicMaterial;
    const handlebarMaterial = this.handlebar.material as MeshBasicMaterial;
    ringMaterial.color.set(color);
    handlebarMaterial.color.set(color);
  };  

  // public method for look at camera
  public lookAtCamera = (camera: Camera) => {
    const direction = new Vector3();
    camera.getWorldDirection(direction);
    this.ring.lookAt(direction);
    this.handlebar.lookAt(direction);
  };

  public camera: Camera | null = null;
    private controlsWorldOrientation = new Quaternion();
    private _temp1 = new Vector3();
    private _temp2 = new Vector3();
    private _temp3 = new Quaternion();
    private worldPosition = new Vector3();
 
  updateMatrixWorld(force?: boolean): void {
    if (this.camera !== null) {
      this.parent?.matrixWorld.decompose(this._temp1, this.controlsWorldOrientation, this._temp2);
      this.matrixWorld.decompose(this.worldPosition, this._temp3, this._temp2);
      this.camera
        .getWorldQuaternion(this.quaternion)
        .premultiply(this.controlsWorldOrientation.invert());
      this.camera.getWorldPosition(this.up).sub(this.worldPosition);
    }
    super.updateMatrixWorld(force);
  }
}
