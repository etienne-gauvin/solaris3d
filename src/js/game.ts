import * as EventEmitter from 'events'
import * as Chance from 'chance'
import InventoryUI from './ui/inventory-ui'
import Color from './color'
import Ground from './ground'
import Player from './player'
import Camera from './camera'
import Controls from './solaria-controls'
import * as ITEM from './items'
import * as UUID from 'uuid'
import * as THREE from 'three'
import * as dat from 'dat-gui'

interface ThreeModel {
	path: string
	geometry?: THREE.Geometry
	materials?: Array<THREE.Material>
}

interface Data {
	models: {
		[key: string]: ThreeModel
	}
}

class Game extends EventEmitter {
	
	/**
	 * Files to load
	 */
	public readonly data: Data = {
		models: {
			player: { path: '../models/player.json' },
			peach: { path: '../models/peach.json' }
		}
	}
	
	/**
	 * Current loop event
	 */
	public readonly event = {
		delta: 0,
		time: 0
	}
	
	/**
	 * The unique Game instance
	 */
	private static instance: Game
	
	/**
	 * Constructor
	 */
	private constructor() {

		super()
		
	}
	
	/**
	 * dat.GUI
	 */
	public controls: Controls
	
	/**
	 * dat.GUI
	 */
	public datgui: dat.GUI = new dat.GUI
	
	/**
	 * UI Objects
	 */
	public readonly ui: { [key: string]: any } = {}
	
	/**
	 * Game instance
	 */
	public static getInstance(): Game {
		
		return this.instance || new Game
		
	}
	
	// Display size
	public width: number
	public height: number
	
	// Current Scene
	public scene: THREE.Scene
	
	// Chance
	public readonly chance = new Chance
	
	// Renderer
	public renderer: THREE.WebGLRenderer
	
	// Camera
	public camera: Camera

	/**
	 * Charger les fichiers
	 */
	load(callback): Promise<Function> {

		return this.loadModels().then(callback)

	}

	/**
	 * Charger les fichiers
	 */
	loadModels(callback: Function = null): Promise<Function> {

		return new Promise<Function>((resolve: Function, reject: Function) => {

			const models = this.data.models

			// Loader
			const loader = new THREE.JSONLoader()
			
			// Vérifier qu'un fichier est chargé
			const isLoaded = file => file.geometry || file.materials

			// Charger chaque fichier
			for (let f in models) {
				
				let file = models[f]
				
				if (!isLoaded(file)) {
					
					loader.load(file.path, (geometry, materials) => {
						
						file.geometry = geometry
						file.materials = materials
						
						console.info(`Loaded: ${file.path}`)
						
						let allLoaded = true
						
						for (let ff in models) {

							allLoaded = allLoaded && isLoaded(models[ff])
						
						}
						
						if (allLoaded) resolve()
						
					})
					
				}
				
			}

		})

	}

	/**
	 * Initialisation
	 */
	init() {
		
		this.controls = new Controls
		
	}

	/**
	 * Create UI
	 */
	createUI() {

		this.ui.inventory = new InventoryUI

	}
	 
	/**
	 * Création de la scène
	 */
	createScene() {
		
		// Get the width and the height of the screen,
		// use them to set up the aspect ratio of the camera 
		// and the size of the renderer.
		this.height = window.innerHeight
		this.width = window.innerWidth

		// Create the scene
		this.scene = new THREE.Scene()
		this.datgui.add(this.scene, 'visible').name('Scene Visible')
		
		// Add a fog effect to the scene same color as the
		// background color used in the style sheet
		// this.scene.fog = new THREE.Fog(new THREE.Color("#5DBDE5"), 150, 300)
		
		// Create the renderer
		const renderer = this.renderer = new THREE.WebGLRenderer({ 
			// Allow transparency to show the gradient background
			// we defined in the CSS
			alpha: true, 

			// Activate the anti-aliasing this is less performant,
			// but, as our project is low-poly based, it should be fine :)
			antialias: true 
		})

		// Define the size of the renderer in this case,
		// it will fill the entire screen
		renderer.setSize(this.width, this.height)
		
		// Enable shadow rendering
		renderer.shadowMap.enabled = true
		renderer.shadowMap.type = THREE.PCFSoftShadowMap
		
		// Add the DOM element of the renderer to the 
		// container we created in the HTML
		const container = document.querySelector('main')
		container.appendChild(renderer.domElement)

		// Listen to the screen: if the user resizes it
		// we have to update the camera and the renderer size
		window.addEventListener('resize', () => {
			
			this.height = window.innerHeight
			this.width = window.innerWidth
			
			renderer.setSize(this.width, this.height)
			
			this.camera.aspect = this.width / this.height
			this.camera.updateProjectionMatrix()
			
		}, false)
		
	}
	
	// Shadow Light
	public shadowLight: THREE.Light
	
	/**
	 * Création des lumières
	 */
	createLights() {
		
		// A hemisphere light is a gradient colored light; 
		// the first parameter is the sky color, the second parameter is the ground color, 
		// the third parameter is the intensity of the light
		const hemisphereLight = new THREE.HemisphereLight(Color.White, Color.White, 1)
		
		// A directional light shines from a specific direction. 
		// It acts like the sun, that means that all the rays produced are parallel. 
		const shadowLight = new THREE.DirectionalLight(0xffffff, 0.3)
		
		// Set the direction of the light  
		shadowLight.position.set(0, 0, 10)
		
		// Allow shadow casting 
		shadowLight.castShadow = true
		// shadowLight.shadowCameraVisible = true

		// // define the visible area of the projected shadow
		/*shadowLight.shadow.camera.left = -20
		shadowLight.shadow.camera.right = 20
		shadowLight.shadow.camera.top = 20
		shadowLight.shadow.camera.bottom = -20
		shadowLight.shadow.camera.near = 1
		shadowLight.shadow.camera.far = 1000*/

		// define the resolution of the shadow; the higher the better, 
		// but also the more expensive and less performant
		shadowLight.shadow.mapSize.width = 2048
		shadowLight.shadow.mapSize.height = 2048
		this.shadowLight = shadowLight

		this.scene.add(shadowLight)
		this.scene.add(hemisphereLight)
	}
	
	public ground: Ground
	
	public player: Player

	/**
	 * Création du sol
	 */
	createObjects() {

		this.ground = new Ground

		// Create the player
		this.player = new Player

		// Attach the InventoryUI to the player's inventory
		this.ui.inventory.attach(this.player.inventory)

		// Adding an object ot the player's inventory
		//this.player.inventory.add(new ITEM.WoodenChair)
		this.player.inventory.add(new ITEM.Peach)
		
		// Create the camera
		this.camera = new Camera
		
	}

	line(a, b, color, dashed = false) {
		
		color = new THREE.Color(color || `hsl(${this.chance.integer({min: 0, max: 360})}, 100%, 50%)`)
		
		let material
		
		if (dashed) {
			material = new THREE.LineDashedMaterial({
				color: color,
				dashSize: 2,
				gapSize: 3
			})
		}
		
		else {
			material = new THREE.LineBasicMaterial({
				color: color
			})
		}
		
	    var geometry = new THREE.Geometry()
	    geometry.vertices.push(a)
	    geometry.vertices.push(b)
		
	    const line = new THREE.Line(geometry, material)
	    line.name = "Line " + this.chance.string()
	    
	    return line
	    
	}

	/**
	 * Boucle du jeu
	 */
	loop(time = 0) {

		const event = this.event
		
		time /= 1000
		
		event.delta = time - event.time
		event.time = time
		
		// Mise à jour des contrôles
		this.controls.update(event)
		
		// Mise à jour des objets
		this.scene.traverseVisible((child: any) => {
			
			if (child.name && child.name.match(/^Line/)) {
				child.geometry.verticesNeedUpdate = true
			}
			
			child.update && child.update(event)
			
		})

		// Diffusion de l'event "update"
		this.emit('update', event)
		
		// Mise à jour de la caméra
		this.camera.update(event)
		
		// Affichage
		this.renderer.render(this.scene, this.camera)
		
		// Prochaine frame
		window.requestAnimationFrame(this.loop.bind(this))

	}

}

export default Game.getInstance()