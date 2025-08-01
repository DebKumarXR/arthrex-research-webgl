import {
	WebGLRenderer,
	PCFSoftShadowMap,
	Scene,
	DirectionalLight,
	AmbientLight,
	PerspectiveCamera,
	OrthographicCamera,
	BoxGeometry,
	DoubleSide,
	FrontSide,
	Mesh,
	BufferGeometry,
	MeshStandardMaterial,
	MeshBasicMaterial,
	SphereGeometry,
	MathUtils,
	CylinderGeometry,
	TorusGeometry,
	TorusKnotGeometry,
	BufferAttribute,
} from 'three';
import * as THREE from 'three';
import  Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MeshBVHVisualizer } from 'three-mesh-bvh';
import SpriteText from "three-spritetext";
//import * as FreeformControls from '../lib/three-freeform-controls';
import RotationControlManager from '../lib/RotationControlManager';
import  Controls  from '../lib/Controls';
import { EVENTS } from "../lib/utils/events";

import {
	Brush,
	Evaluator,
	EdgesHelper,
	TriangleSetHelper,
	logTriangleDefinitions,
	GridMaterial,
	ADDITION,
	SUBTRACTION,
	REVERSE_SUBTRACTION,
	INTERSECTION,
	DIFFERENCE,
	HOLLOW_INTERSECTION,
	HOLLOW_SUBTRACTION,
} from '..';
import { func } from 'three/examples/jsm/nodes/Nodes.js';


window.logTriangleDefinitions = logTriangleDefinitions;

const params = {

	brush1Shape: 'box',
	brush1Complexity: 1,
	brush1Color: '#d1d1d1',

	brush2Shape: 'sphere',
	brush2Complexity: 1,
	brush2Color: '#E91E63',

	operation: SUBTRACTION,
	wireframe: false,
	displayBrushes: true,
	displayControls: false,
	shadows: false,
	vertexColors: false,
	flatShading: false,
	gridTexture: false,
	useGroups: true,

	enableDebugTelemetry: true,
	displayIntersectionEdges: false,
	displayTriangleIntersections: false,
	displayBrush1BVH: false,
	displayBrush2BVH: false,

	minScale: 1.5,
	maxScale: 2.0,
	rotate: true,
	spriteRadius: 0.4,
	visMode: 'normal',
	reset: function () {
		resetScene();
		removeDecal();
	},

	positionA: function () {
		changePosition(0);
	},

	positionB: function () {
		changePosition(1);
	},
	positionC: function () {
		changePosition(2);
	},
	positionD: function () {
		changePosition(3);
	},
	pelvicTiltAdd: function () {
		pelvicTilt(0.1);
	},
	pelvicTiltSubtract: function () {
		pelvicTilt(-0.1);
	}


};

let stats;
let renderer, camera, scene, gui, outputContainer;
let controls, transformControls;
let brush1, brush2;
let resultObject, wireframeResult, light, originalMaterial;
let edgesHelper, trisHelper;
let bvhHelper1, bvhHelper2;
let needsUpdate = true;
let csgEvaluator;
// meshes
let hipGLTF;
let femurGLTF;
let hipMesh;
let femurMesh;
const materialMap = new Map();

// controllers
const _controllers = {
  startZCtrl: null,
  startYCtrl: null,
  startXCtrl: null,
  pelvicTiltCtrl: null,
};

// decals
let decalMesh;
let raycaster;


const intersection = {
	intersects: false,
	point: new THREE.Vector3(),
	normal: new THREE.Vector3()
};
const mouse = new THREE.Vector2();
const intersects = [];

const textureLoader = new THREE.TextureLoader();
const decalDiffuse = textureLoader.load( '/textures/decal/decal-diffuse-1.png' );
decalDiffuse.colorSpace = THREE.SRGBColorSpace;
const decalNormal = textureLoader.load( '/textures/decal/decal-normal-1.jpg' );

const decalMaterial = new THREE.MeshPhongMaterial( {
	specular: 0x444444,
	map: decalDiffuse,
	normalMap: decalNormal,
	normalScale: new THREE.Vector2( 1, 1 ),
	shininess: 30,
	transparent: true,
	depthTest: true,
	depthWrite: false,
	polygonOffset: true,
	polygonOffsetFactor: - 4,
	wireframe: false
} );


const decals = [];
let mouseHelper;
const position = new THREE.Vector3();
const orientation = new THREE.Euler();
const size = new THREE.Vector3( 10, 10, 10 );
let lastDecalUpdateTime;
let impgNeedUpdate = false;
let decalBoneRotation = new THREE.Vector3(0, 0, 0);

// Sprite group for impingement
let spriteGroup = new THREE.Group();
const sprites = [];
const spriteDiffuse = textureLoader.load( 'textures/decal/decal-diffuse-1.png' );
spriteDiffuse.colorSpace = THREE.SRGBColorSpace;
const spriteMaterial = new THREE.SpriteMaterial( {
	 map: spriteDiffuse,
	 color: '#af2f2f',
	 fog: true
} );

//Hud
let hudcamera, hudScene;
let impingementLabel;
let hudCamFrustumSize; 
let hudmesh;

// Custom controls
let controlsManager;
const gizmoMaterial = new MeshBasicMaterial( {
	depthTest: false,
	depthWrite: false,
	fog: false,
	toneMapped: false,
	transparent: true
} );	

// Render target hip
let renderTarget;
let rtScene, rtCamera, rtMesh, rtMeshSize;
let rtUpdateState = 0;
let rtUpdateStateTime;

// Render target femur
let femurRenderTarget;
let femurRtScene, femurRtCamera, femurRtMesh, femurRtMeshSize;
let femurRtUpdateState = 0;
let femurRtUpdateStateTime;

// View reset
let camOldPosition = new THREE.Vector3();
let camOldRotation = new THREE.Quaternion();
let oldVisMode = 'normal';
let sceneBgColor = new THREE.Color( '#151515' );
let lightOldPosition = new THREE.Vector3();
let tempBoxMesh;
let tempBoxMesh2;



//----- Initialize the scene and start rendering
init();

async function init() {

	const bgColor = 0x111111;

	outputContainer = document.getElementById( 'output' );

	// renderer setup
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	renderer.setClearColor( bgColor, 1 );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = PCFSoftShadowMap;
	document.body.appendChild( renderer.domElement );	

	// stats
	stats = new Stats();
	document.body.appendChild( stats.dom );
	
	// scene setup
	scene = new Scene();
	scene.background = sceneBgColor;

	// lights
	lightOldPosition = new THREE.Vector3( -20, 2, 3 );
	light = new DirectionalLight( 0xffffff, 2.5 );
	light.position.set( lightOldPosition.x, lightOldPosition.y, lightOldPosition.z );
	scene.add( light, light.target );
	scene.add( new AmbientLight( 0xb0bec5, 0.35 ) );

	// shadows
	const shadowCam = light.shadow.camera;
	light.castShadow = false;
	light.shadow.mapSize.setScalar( 2048 );
	light.shadow.bias = 1e-5;
	light.shadow.normalBias = 1e-2;

	shadowCam.left = shadowCam.bottom = - 2.5;
	shadowCam.right = shadowCam.top = 2.5;
	shadowCam.updateProjectionMatrix();

	// camera setup
	camera = new PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 50 );
	camera.position.set( -20.26, -0.02, -10.02 );
	camera.far = 100;
	camera.updateProjectionMatrix();

	// Hud Camera
	hudCamFrustumSize = 5;
	const aspect = window.innerWidth / window.innerHeight;
	hudcamera = new OrthographicCamera(
		(hudCamFrustumSize * aspect) / -2,
		(hudCamFrustumSize * aspect) / 2,
		hudCamFrustumSize / 2,
		hudCamFrustumSize / -2,
		0.1,
		100
	);

	hudScene = new Scene();
	hudcamera.position.z = 5;

	// Render target
	renderTarget = new THREE.WebGLRenderTarget( 512, 512, {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
		stencilBuffer: false,
		depthBuffer: true
	} );
	renderTarget.texture.name = 'hipRenderTarget';
	rtCamera = new OrthographicCamera(
		(hudCamFrustumSize * aspect) / -2,
		(hudCamFrustumSize * aspect) / 2,
		hudCamFrustumSize / 2,
		hudCamFrustumSize / -2,
		0.1,
		100
	);
	rtScene = new Scene();
	rtCamera.position.z = 5;
	rtUpdateStateTime = Date.now()- 1000; // start with an update


	// Render target femur
	femurRenderTarget = new THREE.WebGLRenderTarget( 512, 512, {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
		stencilBuffer: false,
		depthBuffer: true
	} );
	femurRenderTarget.texture.name = 'femurRenderTarget';
	femurRtCamera = new OrthographicCamera(
		(hudCamFrustumSize * aspect) / -2,
		(hudCamFrustumSize * aspect) / 2,
		hudCamFrustumSize / 2,
		hudCamFrustumSize / -2,
		0.1,
		100
	);
	femurRtScene = new Scene();
	femurRtCamera.position.z = 5;
    femurRtUpdateStateTime = Date.now()- 1000; // start with an update



	// controls
	controls = new OrbitControls( camera, renderer.domElement );

	transformControls = new TransformControls( camera, renderer.domElement );
	transformControls.setSize( 0.75 );
	transformControls.addEventListener( 'dragging-changed', e => {
		controls.enabled = ! e.value;
	} );
	transformControls.addEventListener( 'objectChange', () => {
		needsUpdate = true;
	} );
	scene.add( transformControls );
	

	// CSG evaluator
	csgEvaluator = new Evaluator();
	csgEvaluator.attributes = [ 'position', 'normal' ];

	// initialize brushes
	brush1 = new Brush( new BoxGeometry(), new GridMaterial() );
	brush2 = new Brush( new BoxGeometry(), new GridMaterial() );


	updateBrush( brush1, params.brush1Shape, params.brush1Complexity );
	updateBrush( brush2, params.brush2Shape, params.brush2Complexity );

	// initialize materials
	brush1.material.opacity = 0.15;
	brush1.material.transparent = true;
	brush1.material.depthWrite = false;
	brush1.material.polygonOffset = true;
	brush1.material.polygonOffsetFactor = 0.2;
	brush1.material.polygonOffsetUnits = 0.2;
	brush1.material.side = DoubleSide;
	brush1.material.premultipliedAlpha = true;
	brush1.material.roughness = 0.25;
	brush1.material.color.set( "#e7e7e7" );

	brush2.material.opacity = 0.15;
	brush2.material.transparent = true;
	brush2.material.depthWrite = false;
	brush2.material.polygonOffset = true;
	brush2.material.polygonOffsetFactor = 0.2;
	brush2.material.polygonOffsetUnits = 0.2;
	brush2.material.side = DoubleSide;
	brush2.material.premultipliedAlpha = true;
	brush2.material.roughness = 0.25;
	brush2.material.color.set( "#E91E63" );

	brush1.receiveShadow = true;
	brush2.receiveShadow = true;
	transformControls.attach( brush2 );

	scene.add( brush1, brush2 );

	// create material map for transparent to opaque variants
	let mat;
	mat = brush1.material.clone();
	mat.side = FrontSide;
	mat.opacity = 1;
	mat.transparent = false;
	mat.depthWrite = true;
	materialMap.set( brush1.material, mat );

	mat = brush2.material.clone();
	mat.side = FrontSide;
	mat.opacity = 1;
	mat.transparent = false;
	mat.depthWrite = true;
	materialMap.set( brush2.material, mat );

	materialMap.forEach( ( m1, m2 ) => {

		m1.enableGrid = params.gridTexture;
		m2.enableGrid = params.gridTexture;

	} );

	// add object displaying the result
	resultObject = new Mesh( new BufferGeometry(), new MeshStandardMaterial( {
		flatShading: false,
		polygonOffset: true,
		polygonOffsetUnits: 0.1,
		polygonOffsetFactor: 0.1,
		color: params.brush1Color,
	} ) );
	resultObject.castShadow = true;
	resultObject.receiveShadow = true;
	originalMaterial = resultObject.material;
	scene.add( resultObject );

	// add wireframe representation
	wireframeResult = new Mesh( resultObject.geometry, new MeshBasicMaterial( {
		wireframe: true,
		color: 0,
		opacity: 0.15,
		transparent: true,
	} ) );
	scene.add( wireframeResult );

	// helpers
	edgesHelper = new EdgesHelper();
	edgesHelper.color.set( 0xE91E63 );
	scene.add( edgesHelper );

	trisHelper = new TriangleSetHelper();
	trisHelper.color.set( 0x00BCD4 );
	scene.add( trisHelper );

	bvhHelper1 = new MeshBVHVisualizer( brush1, 20 );
	bvhHelper2 = new MeshBVHVisualizer( brush2, 20 );
	scene.add( bvhHelper1, bvhHelper2 );

	bvhHelper1.update();
	bvhHelper2.update();

	// load hip geometry
	hipGLTF = await new GLTFLoader()
		.setMeshoptDecoder( MeshoptDecoder )
		.loadAsync( '/mesh/hip.glb' );

	hipMesh = hipGLTF.scene.children[ 0 ].geometry;
	hipMesh.computeVertexNormals();


	//load femur geometry
	femurGLTF = await new GLTFLoader()
		.setMeshoptDecoder( MeshoptDecoder )
		.loadAsync( '/mesh/femur.glb' );

	femurMesh = femurGLTF.scene.children[ 0 ].geometry;
	femurMesh.computeVertexNormals();


	// create custom control
	initTransformControls();

	// gui
	gui = new GUI();

	// default rotate
	transformControls.setMode( 'rotate' );
	window.addEventListener( 'resize', function () {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize( window.innerWidth, window.innerHeight );

	}, false );

	window.addEventListener( 'keydown', function ( e ) {

		switch ( e.code ) {		
			case 'KeyE':
				transformControls.setMode( 'rotate' );
				break;
		}

	} );

	//add a button for position modes
	const positionFolder = gui.addFolder( 'Positions' );
	positionFolder.add(params, 'positionA').name('STAND');
	positionFolder.add(params, 'positionB').name('45° SQUAT');
	positionFolder.add(params, 'positionC').name('90° SQUAT');
	positionFolder.add(params, 'positionD').name('120° SQUAT');
	positionFolder.open();


	const pelvicFolder = gui.addFolder( 'Pelvic' );
	_controllers.pelvicTiltCtrl = pelvicFolder.add( brush1.rotation, 'x', -Math.PI / 2, Math.PI / 2 ).name( 'Pelvic Tilt' ).onChange( () => {
		needsUpdate = true;
	} );
	pelvicFolder.add(params, 'pelvicTiltAdd').name('+');
	pelvicFolder.add(params, 'pelvicTiltSubtract').name('-');

	// add brush2 rotation controls
	const rotFolder = gui.addFolder( 'Rotation' );
	_controllers.startXCtrl = rotFolder.add( brush2.rotation, 'x', -Math.PI, Math.PI ).name( 'Flexion/Extension' ).onChange( () => {
		needsUpdate = true;
		controlsManager.setObjectRotation( new THREE.Vector3( brush2.rotation.x, brush2.rotation.y, brush2.rotation.z ) );
	} );
	_controllers.startYCtrl = rotFolder.add( brush2.rotation, 'y', -Math.PI, Math.PI ).name( 'Abduction/Adduction' ).onChange( () => {
		needsUpdate = true;
		controlsManager.setObjectRotation( new THREE.Vector3( brush2.rotation.x, brush2.rotation.y, brush2.rotation.z ) );
	} );
	_controllers.startZCtrl = rotFolder.add( brush2.rotation, 'z', -Math.PI, Math.PI ).name( 'Internal/External' ).onChange( () => {
		needsUpdate = true;
		controlsManager.setObjectRotation( new THREE.Vector3( brush2.rotation.x, brush2.rotation.y, brush2.rotation.z ) );
	} );
	rotFolder.open();


	const visModeFolder = gui.addFolder( 'Impingement' );	

	//add a button for collision/visual mode
	visModeFolder.add(params, 'visMode', ['normal','transparent', 'intersection', 'intersection_reverse' ]).name('Mode').onChange( (v) => {
		updateVisualMode( v );
		oldVisMode = v;
	});

	updateVisualMode( 'normal' );
	oldVisMode = 'normal';

	visModeFolder.add( params, 'gridTexture' ).onChange( v => {

		materialMap.forEach( ( m1, m2 ) => {

			m1.enableGrid = v;
			m2.enableGrid = v;

		} );

	} );
	visModeFolder.add( params, 'wireframe' );

	
    visModeFolder.add(params, 'spriteRadius', 0.1, 1.0).name('Impingement Radius');
	visModeFolder.add(params, 'reset' ).name('Reset');
	visModeFolder.open();

	// HUD Controls
	const planeGeometry = new BoxGeometry( 2, 1, 0.01 );
	const material = new MeshBasicMaterial({ color: '#000000'});	
	hudmesh = new Mesh(planeGeometry, material);
	hudmesh.position.x = hudcamera.left + 1;
	hudmesh.position.y = hudcamera.bottom + 0.5;
	hudScene.add(hudmesh);

	//label for impingement	
	impingementLabel = new SpriteText( 'Impingement Area', 0.1 );
	impingementLabel.position.set(0, 0.4, 0.01);
	hudmesh.add(impingementLabel);

	// init decals
	initDecal();

	// init render target	
	rtMeshSize = new THREE.Vector2( 2, 1.3 );
	const renderTargetGeometry = new BoxGeometry( rtMeshSize.x, rtMeshSize.y, 0.01 );
	const renderTargetMaterial = new MeshBasicMaterial( {
		map: renderTarget.texture
	} );	
	
	rtMesh = new Mesh( renderTargetGeometry, renderTargetMaterial );
	rtMesh.position.set( rtCamera.left + rtMeshSize.x/2, rtCamera.bottom + rtMeshSize.y/2, 0.01 );
	rtScene.add( rtMesh );

	// init femur render target
	femurRtMeshSize = new THREE.Vector2( 2, 1.3 );
	const femurRenderTargetGeometry = new BoxGeometry( femurRtMeshSize.x, femurRtMeshSize.y, 0.01 );
	const femurRenderTargetMaterial = new MeshBasicMaterial( {
		map: femurRenderTarget.texture
	} );
	//const femurRenderTargetMaterial = new MeshBasicMaterial({ color: '#cc0d0d'});	

	femurRtMesh = new Mesh( femurRenderTargetGeometry, femurRenderTargetMaterial );
	femurRtMesh.position.set( femurRtCamera.left + femurRtMeshSize.x/2, femurRtCamera.bottom + femurRtMeshSize.y*1.52, 0.01 );
	femurRtScene.add( femurRtMesh );


	//camera adjustment for femur render target
	const tempBoxGeometry = new BoxGeometry( 1, 1, 1 );
	const tempBoxMaterial = new MeshBasicMaterial({ color: '#00ff00', transparent: true, opacity: 0.5 });
	tempBoxMesh = new Mesh( tempBoxGeometry, tempBoxMaterial );	
	tempBoxMesh.position.set( 6, 2, -2 );
	tempBoxMesh.lookAt( 0, 0, 0 );

	tempBoxMesh2 = new Mesh( tempBoxGeometry, tempBoxMaterial );
	tempBoxMesh2.position.set( 0, 0, 0 );
	tempBoxMesh2.add(tempBoxMesh);
	scene.add(tempBoxMesh2);
	tempBoxMesh2.visible = false; // hide the temp box mesh


	//update brush mesh
	if(hipMesh !== undefined) {
		// update brush1 with hip mesh
		updateBrush( brush1, 'mesh', params.brush1Complexity, hipMesh );	
		bvhHelper1.update();
	}
	if(femurMesh !== undefined) {
		// update brush2 with femur mesh
		updateBrush( brush2, 'mesh', params.brush2Complexity, femurMesh );
		bvhHelper2.update();
	}

	render();

}

function changePosition( index ) {
	if ( index === 0 ) {
		//stand
		brush2.rotation.set( 0, 0, 0 );
		controlsManager.setObjectRotation( new THREE.Vector3( brush2.rotation.x, brush2.rotation.y, brush2.rotation.z ) );
	}
	else if ( index === 1 ) {
		//45° squat
		brush2.rotation.set( 45 * Math.PI / 180, 5 * Math.PI / 180, 5 * Math.PI / 180 );
		controlsManager.setObjectRotation( new THREE.Vector3( brush2.rotation.x, brush2.rotation.y, brush2.rotation.z ) );
	}
	else if ( index === 2 ) {
		//90° squat
		brush2.rotation.set(90 * Math.PI / 180, 10 * Math.PI / 180, 10 * Math.PI / 180 );
		controlsManager.setObjectRotation( new THREE.Vector3( brush2.rotation.x, brush2.rotation.y, brush2.rotation.z ) );
	}
	else if ( index === 3 ) {
		//120° squat
		brush2.rotation.set( 120 * Math.PI / 180, 15 * Math.PI / 180, 15 * Math.PI / 180 );
		controlsManager.setObjectRotation( new THREE.Vector3( brush2.rotation.x, brush2.rotation.y, brush2.rotation.z ) );
	}
	Object.keys(_controllers).forEach((key) => _controllers[key].updateDisplay());
	needsUpdate = true;	
}
function pelvicTilt(value)
{
	brush1.rotation.x += value;
	Object.keys(_controllers).forEach((key) => _controllers[key].updateDisplay());
	needsUpdate = true;	
}

function updateVisualMode( mode ) {

	materialMap.get( brush2.material ).color.set( params.brush2Color );	
	materialMap.get( brush1.material ).color.set( params.brush1Color );

	if ( mode === 'transparent' ) {
		params.operation = SUBTRACTION;
		
		params.useGroups = true;
		params.displayBrushes = true;
		brush1.visible = params.displayBrushes;
		brush2.visible = params.displayBrushes;

		showHideDecalMesh( false );
		removeSprites();
	}
	else if ( mode === 'intersection' ) {
		params.operation = SUBTRACTION;
		
		params.useGroups = true;
		params.displayBrushes = false;
		brush1.visible = params.displayBrushes;
		brush2.visible = params.displayBrushes;

		showHideDecalMesh( false );
		removeSprites();
	} else if ( mode === 'normal' ) {

		params.operation = ADDITION;
		params.useGroups = false;

		params.displayBrushes = false;
		brush1.visible = params.displayBrushes;
		brush2.visible = params.displayBrushes;

		showHideDecalMesh( false );
		removeSprites();
		impgNeedUpdate = false;
	}
	else if ( mode === 'intersection_reverse' ) {
		params.operation = REVERSE_SUBTRACTION;
		params.useGroups = true;
		params.displayBrushes = false;
		brush1.visible = params.displayBrushes;
		brush2.visible = params.displayBrushes;

		// update brush1 color to match brush2
		materialMap.get( brush2.material ).color.set( params.brush1Color );
		materialMap.get( brush1.material ).color.set( params.brush2Color );

		showHideDecalMesh( false );
		removeSprites();
	}
	needsUpdate = true;	
	console.log('Visual mode changed:', mode);
}

function updateBrush( brush, type, complexity, mesh ) {
	
	brush.geometry.dispose();
	switch ( type ) {	
		case 'mesh':
			brush.geometry = mesh.clone();
			break;
	}

	brush.geometry = brush.geometry.toNonIndexed();

	const position = brush.geometry.attributes.position;
	const array = new Float32Array( position.count * 3 );
	for ( let i = 0, l = array.length; i < l; i += 9 ) {

		array[ i + 0 ] = 1;
		array[ i + 1 ] = 0;
		array[ i + 2 ] = 0;

		array[ i + 3 ] = 0;
		array[ i + 4 ] = 1;
		array[ i + 5 ] = 0;

		array[ i + 6 ] = 0;
		array[ i + 7 ] = 0;
		array[ i + 8 ] = 1;

	}

	brush.geometry.setAttribute( 'color', new BufferAttribute( array, 3 ) );
	brush.prepareGeometry();
	needsUpdate = true;

}

function resetScene() {	

	// reset camera
	camera.position.set(-20.26, -0.02, -10.02 );
	camera.updateProjectionMatrix();
	controls.reset();
	

	controlsManager.setObjectRotation( new THREE.Vector3( 0, 0, 0 ) );
	// reset brushes positions and rotations
	brush1.rotation.set( 0, 0, 0 );
	brush1.position.set( 0, 0, 0 );
	brush2.rotation.set( 0, 0, 0 );
	brush2.position.set( 0, 0, 0 );	

	Object.keys(_controllers).forEach((key) => _controllers[key].updateDisplay());
	needsUpdate = true;	

	params.spriteRadius = 0.4;
	removeDecal();
	removeSprites();
}




// add sprites on edge mesh
function addSpritesOnEdge() {
	if ( edgesHelper === undefined ) return;

	//remove existing sprites
	removeSprites();

	const positions = edgesHelper.geometry.attributes.position;
	console.log( 'addSpritesOnEdge - positions count:', positions.count );	

	let pos = new THREE.Vector3();
	let lastPosition = new THREE.Vector3();
	for ( let a = 0; a < positions.count; a ++ ) {

		pos.fromBufferAttribute( positions, a );
		// if the position is too close to the last position, skip it

		const distance = pos.distanceTo(lastPosition);
		const minDistance = params.spriteRadius * 0.1; // minimum distance between sprites
		if ( distance > minDistance || a === 0 ) 
		{			
			let material = spriteMaterial.clone();
			const sprite = new THREE.Sprite( material );
			lastPosition.copy( pos );

			sprite.position.copy( pos );		
			sprite.scale.set( params.spriteRadius, params.spriteRadius, params.spriteRadius ); // set sprite size
			spriteGroup.add( sprite );	
		}		
		
	}

	// convert positions to Vector3 array
	const positionsArray = [];
	for ( let i = 0; i < positions.count; i++ ) {
		const pos = new THREE.Vector3();
		pos.fromBufferAttribute( positions, i );
		positionsArray.push( pos );
	}

	//create a bounding box from positions
	const boundingBox = new THREE.Box3().setFromPoints( positionsArray );

	// find area of the edge mesh
	const edgeArea = boundingBox.getSize( new THREE.Vector3() ).length();

	//update label text
	impingementLabel.text = `Impingement Area: ${edgeArea.toFixed(2)} cm²`;

	// log total sprites
	console.log( 'Total sprites added:', spriteGroup.children.length );
	scene.add( spriteGroup );
}

// remove all sprites
function removeSprites() {
	if ( spriteGroup === undefined ) return;

	// log total sprites before removing
	console.log( 'Removing sprites:', spriteGroup.children.length );

	while ( spriteGroup.children.length > 0 ) {
		const sprite = spriteGroup.children[ 0 ];
		spriteGroup.remove( sprite );
		sprite.material.dispose();
		sprite.geometry.dispose();
	}

	scene.remove( spriteGroup );
}

//Update decals on boolean mesh edges
function addDecalsOnEdge() {
	if ( decalMesh === undefined ) return;

	const positions = edgesHelper.geometry.attributes.position;
	console.log( 'addDecalsOnEdge - positions count:', positions.count );
	
	// add decals for all vertices positions
	let lastPosition = new THREE.Vector3();
	let pos = new THREE.Vector3();
	for ( let i = 0; i < positions.count; i++ ) {
		pos.fromBufferAttribute( positions, i );

		const distance = pos.distanceTo(lastPosition);
		// if the position is too close to the last position, skip it
		if ( distance > 0.5 || i === 0 ) 
		{			
			lastPosition.copy( pos );
			addDecalAtPosition( pos );		
		}		
	}

	// log total decals
	console.log( 'Total decals added:', decals.length );

	const position = decalMesh.geometry.attributes.position;
	const colors = new Float32Array( position.count * 3 );
	for ( let i = 0; i < position.count; i++ ) {
		colors[ i * 3 + 0 ] = 1;
		colors[ i * 3 + 1 ] = 1;
		colors[ i * 3 + 2 ] = 1;
	}
	decalMesh.geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
	decalMesh.geometry.computeVertexNormals();
	
}

// init decal
function initDecal() {
	
	const geometry = new THREE.BufferGeometry();
	geometry.setFromPoints( [ new THREE.Vector3(), new THREE.Vector3() ] );

	lastDecalUpdateTime = Date.now();

	loadSourceMesh();

	raycaster = new THREE.Raycaster();

	mouseHelper = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 10 ), new THREE.MeshNormalMaterial() );
	mouseHelper.visible = false;
	scene.add( mouseHelper );

	window.addEventListener( 'resize', onWindowResize );

	let moved = false;

	controls.addEventListener( 'change', function () {

		moved = true;

	} );

	window.addEventListener( 'pointerdown', function () {

		moved = false;

	} );
}

function checkIntersectionAtPosition( position ) {
	if ( decalMesh === undefined ) return;

	const pointer = new THREE.Vector2();
	const vec = position.project( camera );
	pointer.x = vec.x;
    pointer.y = vec.y;

	raycaster.setFromCamera( pointer, camera );
	raycaster.intersectObject( decalMesh, false, intersects );
	

	if ( intersects.length > 0 ) {

		const p = intersects[ 0 ].point;
		mouseHelper.position.copy( p );
		intersection.point.copy( p );

		const normalMatrix = new THREE.Matrix3().getNormalMatrix( decalMesh.matrixWorld );

		const n = intersects[ 0 ].face.normal.clone();
		n.applyNormalMatrix( normalMatrix );
		n.multiplyScalar( 10 );
		n.add( intersects[ 0 ].point );

		intersection.normal.copy( intersects[ 0 ].face.normal );
		mouseHelper.lookAt( n );

	
		intersection.intersects = true;

	} else {

		intersection.intersects = false;

	}

}
// load glb source mesh
async function loadSourceMesh() {
	
	const loader = new GLTFLoader();

	loader.load( '/mesh/hip.glb', function ( gltf ) {

		decalMesh = gltf.scene.children[ 0 ];
		decalMesh.material = new THREE.MeshPhongMaterial( {
			specular: 0x111111,
			vertexColors: true,
			color: 0xaaaaaa,			
			shininess: 25
		} );

		scene.add( decalMesh );
		decalMesh.scale.multiplyScalar( 10 );

		showHideDecalMesh( false );

		// change vertex colors to white
		const position = decalMesh.geometry.attributes.position;
		const colors = new Float32Array( position.count * 3 );
		for ( let i = 0; i < position.count; i++ ) {
			colors[ i * 3 + 0 ] = 1;
			colors[ i * 3 + 1 ] = 1;
			colors[ i * 3 + 2 ] = 1;
		}
		decalMesh.geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
		decalMesh.geometry.computeVertexNormals();

	} );

}

function showHideDecalMesh( show ) {
	if ( decalMesh === undefined ) return;
	
	if ( show ) {
		decalMesh.scale.set( 1, 1, 1 );
		decalMesh.position.set( 0, 0, 0 );
	}
	else {
		decalMesh.scale.set( 0.0001, 0.0001, 0.0001 );
		decalMesh.position.set( 1000, 1000, 1000 ); // move it far away
	}
}

// function for adding decal on the hip mesh
function addDecal() {	

	position.copy( intersection.point );
	orientation.copy( mouseHelper.rotation );

	// check if this point is too close to existing decals
	for ( let i = 0; i < decals.length; i++ ) {
		const d = decals[ i ];
		const dPos = d.position;
		const distance = position.distanceTo( dPos );
		if ( distance < 0.2 ) {
			console.log( 'skipping decal, too close to existing decal:', distance );
			return;
		}
	}

	if ( params.rotate ) orientation.z = Math.random() * 2 * Math.PI;

	const scale = params.minScale;// + Math.random() * ( params.maxScale - params.minScale );
	size.set( scale, scale, scale );

	const material = decalMaterial.clone();
	//material.color.setHex( Math.random() * 0xffffff );
	material.color.setHex( 0xff0000 );

	const orientationMatrix = new THREE.Matrix4();

	const m = new THREE.Mesh( new DecalGeometry( decalMesh, position, orientationMatrix, size ), material );
	m.renderOrder = decals.length; // give decals a fixed render order

	decals.push( m );

	decalMesh.attach( m );	
}

function addDecalAtPosition( position ) {

	// if no decal mesh, return
	if ( decalMesh === undefined ) return;
	checkIntersectionAtPosition( position );
	addDecal();
}

// remove decal from the hip mesh
function removeDecal() {
	console.log( 'removing decals:', decals.length );
	decals.forEach( function ( d ) {
		decalMesh.remove( d );
	} );
	decals.length = 0;
}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

	const aspect = window.innerWidth / window.innerHeight;

	hudcamera.left = (-hudCamFrustumSize * aspect) / 2;
	hudcamera.right = (hudCamFrustumSize * aspect) / 2;
	hudcamera.top = hudCamFrustumSize / 2;
	hudcamera.bottom = -hudCamFrustumSize / 2;

	hudmesh.position.x = hudcamera.left + 1;
	hudmesh.position.y = hudcamera.bottom + 0.5;

	hudcamera.updateProjectionMatrix();

	//rt camera
	rtCamera.left = (-hudCamFrustumSize * aspect) / 2;
	rtCamera.right = (hudCamFrustumSize * aspect) / 2;
	rtCamera.top = (hudCamFrustumSize) / 2;
	rtCamera.bottom = (-hudCamFrustumSize) / 2;
	rtMesh.position.set( rtCamera.left + rtMeshSize.x/2, rtCamera.bottom + rtMeshSize.y/2, 0.01 );
	rtCamera.updateProjectionMatrix();

	// femur rt camera
	femurRtCamera.left = (-hudCamFrustumSize * aspect) / 2
	femurRtCamera.right = (hudCamFrustumSize * aspect) / 2;
	femurRtCamera.top = (hudCamFrustumSize) / 2;
	femurRtCamera.bottom = (-hudCamFrustumSize) / 2;
	femurRtMesh.position.set( femurRtCamera.left + femurRtMeshSize.x/2, femurRtCamera.bottom + femurRtMeshSize.y*1.52, 0.01 );
	femurRtCamera.updateProjectionMatrix();
}



// init transform controls
function initTransformControls() {	

	controlsManager = new RotationControlManager(camera, renderer.domElement);
	scene.add(controlsManager);

	// anchor controls to the box
	const controls2 = controlsManager.anchor(brush2);
	
	// disable orbit controls while the freeform-controls are in use
	controlsManager.listen(EVENTS.DRAG_START, () => {
		controls.enabled = false;
	});
	controlsManager.listen(EVENTS.DRAG_STOP, () => {
		controls.enabled = true;
	});

}

// method to create an arc and add it to the scene
 function createLine(radius, startAngle, endAngle, segments, color, lineWidth) {       
	// Generate arc points
	const points = [];
	for (let i = 0; i <= segments; i++) {
		const t = i / segments;
		const angle = startAngle + t * (endAngle - startAngle);
		points.push(new THREE.Vector3(
			radius * Math.cos(angle),
			radius * Math.sin(angle),
			0
		));
	}
	const geometry = new THREE.BufferGeometry().setFromPoints(points);
	const material = new THREE.LineBasicMaterial({ color, linewidth: lineWidth });
	const arcLine = new THREE.Line(geometry, material);
	arcLine.lineWidth = lineWidth; // Set line width if supported by renderer
	scene.add(arcLine);
}


// method to create torus geometry and add it to the scene
function createArcLine(radius, tube, radialSegments, tubularSegments, arc, color) {	

	const matRed = gizmoMaterial.clone();
	matRed.color.setHex( color );	

	const geometry = new TorusGeometry(radius, tube, radialSegments, tubularSegments, arc);
	const torus = new Mesh(geometry, matRed);
	return torus;
}

// update Render Target with boolean mesh objects
function updateRTObjectHip(show = true) {	

	if(show == true) {

		scene.background = new THREE.Color( '#000000' );
		
		camOldPosition.copy( camera.position );
		camOldRotation.copy( camera.quaternion );
		updateVisualMode( 'intersection' );

		// update camera position and rotation
		camera.position.set(-5, -2, -1.5);
		camera.lookAt(0, 0, 0);
		camera.updateMatrixWorld();

		controlsManager.visible = false; 	
		femurRtMesh.visible = false;
	}
	else {
		scene.background = sceneBgColor;
		camera.position.copy( camOldPosition );
		camera.quaternion.copy( camOldRotation );
		camera.updateMatrixWorld();

		updateVisualMode( oldVisMode );

		controlsManager.visible = true; 
		femurRtMesh.visible = true;
	}
}

function updateRTObjectFemur(show = true) {
	if(show == true) {

		scene.background = new THREE.Color( '#000000' );
	
		camOldPosition.copy( camera.position );
		camOldRotation.copy( camera.quaternion );
		updateVisualMode( 'intersection_reverse' );

		light.position.set( 10, 0, -3);
		
		const p = tempBoxMesh.getWorldPosition( new THREE.Vector3() );		
		camera.position.set(p.x, p.y , p.z ); // Example: 5 units above, 10 units behind the object
		camera.lookAt(0, 0, 0); // Look at the object's local origin
		camera.rotation.z = tempBoxMesh.rotation.z + Math.PI/2; // Match the rotation of the object		
		camera.updateMatrixWorld();

		controlsManager.visible = false; 	
		rtMesh.visible = false;
	}
	else {
		scene.background = sceneBgColor;
		
		camera.position.copy( camOldPosition );
		camera.quaternion.copy( camOldRotation );
		light.position.copy( lightOldPosition );
		camera.updateMatrixWorld();

		updateVisualMode( oldVisMode );

		controlsManager.visible = true; 
		rtMesh.visible = true;
	}
}

function animate() {

	renderer.autoClear = false;

	if(rtUpdateState == 2)
	{		
		renderer.setRenderTarget( renderTarget );
		renderer.render( scene, camera );			
		rtUpdateState = 3;
	}
	else if (femurRtUpdateState == 2)
	{
		renderer.setRenderTarget( femurRenderTarget );
		renderer.render( scene, camera );	
		femurRtUpdateState = 3;
	}
	else
	{
		renderer.setRenderTarget( null );
		renderer.render( scene, camera );
	}


	//renderer.render( hudScene, hudcamera );
	renderer.render( femurRtScene, femurRtCamera );
	renderer.render( rtScene, rtCamera );
	stats.update();		
	

	//log camera position
	//console.log( 'camera position:', camera.position );
}

function render() {

	requestAnimationFrame( render );	

	if ( controlsManager !== undefined ) {
		if ( controlsManager.isObjectRotationUpdated() ) {

			const rot = controlsManager.getObjectRotation();
			brush2.rotation.set( rot.x, rot.y, rot.z );
			console.log( 'brush2 rotation updated:', brush2.rotation );
			brush2.updateMatrixWorld();
			needsUpdate = true;			
		}		
	}

	//update render target objects
	const currentTime = Date.now();
	if (rtUpdateState === 1) {
		updateRTObjectHip(true);
		rtUpdateState = 2; // reset state
		rtUpdateStateTime = currentTime;
	}
	else if (rtUpdateState === 3) {		
		updateRTObjectHip(false);
		rtUpdateState = 0; // reset state	
		rtUpdateStateTime = currentTime;	
	}
	//femur render target update
	if (femurRtUpdateState === 1) {
		updateRTObjectFemur(true);
		femurRtUpdateState = 2; // reset state
		femurRtUpdateStateTime = currentTime;
	}
	else if (femurRtUpdateState === 3) {
		updateRTObjectFemur(false);
		femurRtUpdateState = 0; // reset state
		femurRtUpdateStateTime = currentTime;
	}
	

	const enableDebugTelemetry = params.enableDebugTelemetry;
	if ( needsUpdate ) {

		needsUpdate = false;		

		brush1.updateMatrixWorld();
		brush2.updateMatrixWorld();
		tempBoxMesh2.rotation.copy( brush2.rotation );
		tempBoxMesh2.updateMatrixWorld();

		const startTime = window.performance.now();
		csgEvaluator.debug.enabled = enableDebugTelemetry;
		csgEvaluator.useGroups = params.useGroups;		
		csgEvaluator.evaluate( brush1, brush2, params.operation, resultObject );		

		if ( params.useGroups ) {

			resultObject.material = resultObject.material.map( m => materialMap.get( m ) );

		} else {

			resultObject.material = originalMaterial;

		}

		const deltaTime = window.performance.now() - startTime;
		outputContainer.innerText = `${ deltaTime.toFixed( 3 ) }ms`;

		if ( enableDebugTelemetry ) {

			edgesHelper.setEdges( csgEvaluator.debug.intersectionEdges );

			trisHelper.setTriangles( [
				...csgEvaluator.debug.triangleIntersectsA.getTrianglesAsArray(),
				...csgEvaluator.debug.triangleIntersectsA.getIntersectionsAsArray()
			] );
		}

		if(rtUpdateState == 0 && (currentTime - rtUpdateStateTime > 200))
		{
			rtUpdateStateTime = currentTime;
			rtUpdateState = 1; // 1 = update objects for render target
		}		
		else if(femurRtUpdateState == 0 && (currentTime - femurRtUpdateStateTime > 200))
		{
			femurRtUpdateStateTime = currentTime;
			femurRtUpdateState = 1; // 1 = update objects for femur render target
		}
	}
	

	// decal update for impingement, we are going to update only when bone is not moving
	if(params.visMode === 'normal') 
	{
		const timeNow = Date.now();
		const rotVector = new THREE.Vector3(0, 0, 0);
		rotVector.copy( brush2.rotation );
		if(decalBoneRotation.distanceTo( rotVector ) > 0.001) {
			lastDecalUpdateTime = timeNow;
			decalBoneRotation.copy( rotVector );
			impgNeedUpdate = false;	
			//removeDecal();
			removeSprites();
		}
		if ( (timeNow - lastDecalUpdateTime) > 1000 && !impgNeedUpdate ) {
			impgNeedUpdate = true;			
			//addDecalsOnEdge();
			addSpritesOnEdge();
		}
	}	

	wireframeResult.visible = params.wireframe;
	brush1.visible = params.displayBrushes;
	brush2.visible = params.displayBrushes;

	light.castShadow = params.shadows;

	transformControls.enabled = params.displayControls;
	transformControls.visible = params.displayControls;

	edgesHelper.visible = enableDebugTelemetry && params.displayIntersectionEdges;
	trisHelper.visible = enableDebugTelemetry && params.displayTriangleIntersections;

	bvhHelper1.visible = params.displayBrush1BVH;
	bvhHelper2.visible = params.displayBrush2BVH;	
	
}

//Reference:
//https://github.com/mrdoob/three.js/blob/dev/examples/jsm/controls/TransformControls.js#L354

//mesh painting brush example
//https://github.com/manthrax/monkeypaint/tree/main

// freeform transform controls
//https://github.com/tocttou/three-freeform-controls/tree/master