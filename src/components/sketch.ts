// imports ->
import * as THREE from 'three'
import {
    GPUComputationRenderer,
    type Variable,
    OrbitControls,
} from 'three/examples/jsm/Addons.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import GUI from 'lil-gui'
import vert from '../shaders/vertParticles.glsl?raw'
import frag from '../shaders/frag.glsl?raw'
import fragVelocity from '../shaders/fragVelocity.glsl?raw'
import fragPosition from '../shaders/fragPosition.glsl?raw'
import { settings } from './gui'
import gsap from 'gsap'
import { textureGetter } from './textureGetter.ts'

// constants ->
const device = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
}
const COUNT: number = 44
const TEXTURE_WIDTH = COUNT ** 2

export class Sketch {
    canvas: HTMLCanvasElement
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    clock: THREE.Clock
    controls: OrbitControls
    gui: GUI
    time: number
    mesh?: THREE.Mesh | THREE.Points
    material?: THREE.ShaderMaterial
    geometry?: THREE.BufferGeometry
    stats?: Stats
    loadScreen: HTMLDivElement | null
    ambientLight?: THREE.AmbientLight
    directionalLight?: THREE.DirectionalLight
    gpuCompute?: GPUComputationRenderer
    velocityVariable?: Variable
    positionVariable?: Variable
    positionUniforms?: { [p: string]: THREE.IUniform }
    velocityUniforms?: { [p: string]: THREE.IUniform }
    baseTexture?: THREE.DataTexture

    target1?: THREE.DataTexture
    target2?: THREE.DataTexture
    target3?: THREE.DataTexture
    headings: NodeListOf<HTMLElement>

    constructor(canvas: HTMLCanvasElement) {
        this.time = 0
        this.loadScreen = document.getElementById('loading') as HTMLDivElement
        this.headings = document.querySelectorAll('.menu h1')

        this.canvas = canvas
        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(
            35,
            device.width / device.height,
            0.01,
            1000
        )
        this.camera.position.set(0, 0, 6)
        this.scene.add(this.camera)

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
        })
        this.renderer.setSize(device.width, device.height)
        this.renderer.setPixelRatio(Math.min(device.pixelRatio, 2))
        this.renderer.setClearColor('#fffff0', 1)
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

        this.controls = new OrbitControls(this.camera, canvas)
        this.gui = new GUI({
            width: 340,
            title: 'Settings',
        })
        this.gui.hide()
        this.clock = new THREE.Clock()

        this.initStats()
        this.init()
    }

    addGeometry(): void {
        this.material = new THREE.ShaderMaterial({
            fragmentShader: frag,
            vertexShader: vert,
            uniforms: {
                time: { value: 0 },
                resolution: { value: new THREE.Vector2() },
                uPositions: { value: null },
            },
            transparent: true,
        })

        this.geometry = new THREE.BufferGeometry()
        let count = TEXTURE_WIDTH
        let pos = new Float32Array(count * 3)
        let reference = new Float32Array(count * 2)

        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 5
            pos[i * 3 + 1] = (Math.random() - 0.5) * 5
            pos[i * 3 + 2] = (Math.random() - 0.5) * 5

            reference[i * 2] = (i % COUNT) / COUNT
            reference[i * 2 + 1] = ~~(i / COUNT) / COUNT
        }
        this.geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(pos, 3)
        )
        this.geometry.setAttribute(
            'reference',
            new THREE.BufferAttribute(reference, 2)
        )

        this.mesh = new THREE.Points(this.geometry, this.material)
        this.scene.add(this.mesh)

        this.addLights()
        this.addHelpers()
    }

    initGPU(): void {
        this.gpuCompute = new GPUComputationRenderer(
            TEXTURE_WIDTH,
            TEXTURE_WIDTH,
            this.renderer
        )

        const dtPosition = this.gpuCompute.createTexture()
        const dtVelocity = this.gpuCompute.createTexture()
        this.fillPositionTexture(dtPosition)
        this.fillVelocityTexture(dtVelocity)
        this.baseTexture = dtPosition.clone()

        this.velocityVariable = this.gpuCompute.addVariable(
            'textureVelocity',
            fragVelocity,
            dtVelocity
        )
        this.positionVariable = this.gpuCompute.addVariable(
            'texturePosition',
            fragPosition,
            dtPosition
        )

        this.gpuCompute.setVariableDependencies(this.velocityVariable, [
            this.positionVariable,
            this.velocityVariable,
        ])
        this.gpuCompute.setVariableDependencies(this.positionVariable, [
            this.positionVariable,
            this.velocityVariable,
        ])

        this.positionUniforms = this.positionVariable.material.uniforms
        this.positionUniforms['time'] = { value: 0.0 }
        this.velocityUniforms = this.velocityVariable.material.uniforms
        this.velocityUniforms['time'] = { value: 1.0 }
        this.velocityUniforms['uTarget'] = { value: dtPosition }

        this.positionVariable.wrapS = THREE.RepeatWrapping
        this.positionVariable.wrapT = THREE.RepeatWrapping
        this.velocityVariable.wrapS = THREE.RepeatWrapping
        this.velocityVariable.wrapT = THREE.RepeatWrapping

        this.gpuCompute.init()
    }

    fillPositionTexture(texture: THREE.DataTexture): void {
        const arr = texture.image.data
        for (let k = 0, k1 = arr.byteLength; k < k1; k += 4) {
            // @ts-ignore
            arr[k] = 2 * Math.random() - 1
            // @ts-ignore
            arr[k + 1] = 2 * Math.random() - 1
            // @ts-ignore
            arr[k + 2] = 2 * Math.random() - 0.5
            // @ts-ignore
            arr[k + 3] = 1
        }
    }

    fillVelocityTexture(texture: THREE.DataTexture): void {
        const arr = texture.image.data
        for (let k = 0, k1 = arr.byteLength; k < k1; k += 4) {
            // @ts-ignore
            arr[k] = (Math.random() - 0.5) * 0.01
            // @ts-ignore
            arr[k + 1] = (Math.random() - 0.5) * 0.01
            // @ts-ignore
            arr[k + 2] = 0
            // @ts-ignore
            arr[k + 3] = 1
        }
    }

    render(): void {
        this.stats?.begin()
        this.time += 0.005

        this.gpuCompute?.compute()
        this.positionUniforms!.time.value = this.time
        this.velocityUniforms!.time.value = this.time

        this.material!.uniforms.uPositions.value =
            this.gpuCompute?.getCurrentRenderTarget(
                this.positionVariable!
            )?.texture

        // this.mesh!.rotation.y += 0.005

        this.controls.update()
        this.renderer.render(this.scene, this.camera)
        this.stats?.end()
        requestAnimationFrame(this.render.bind(this))
    }

    switch(n: number): void {
        n = (n + 1) % 4
        if (n === 1) {
            this.velocityUniforms!.uTarget.value = this.target1
        }
        if (n === 2) {
            this.velocityUniforms!.uTarget.value = this.target2
        }
        if (n === 3) {
            this.velocityUniforms!.uTarget.value = this.target3
        }
        if (n === 0) {
            this.velocityUniforms!.uTarget.value = this.baseTexture
        }
    }

    init(): void {
        this.initGPU()
        this.addGeometry()
        this.resize()

        // pre-compute before render ->
        this.target1 = textureGetter(1, this.gpuCompute!)
        this.target2 = textureGetter(2, this.gpuCompute!)
        this.target3 = textureGetter(3, this.gpuCompute!)
        if (this.loadScreen) {
            this.loadScreen.classList.add('done')
        }
        for (let i = 0; i < this.headings.length; i++) {
            const h = this.headings[i]
            h.addEventListener('mouseover', () => {
                this.switch(i)
            })
        }

        this.render()
    }

    initStats(): void {
        this.stats = new Stats()
        this.stats.showPanel(0)
        this.stats.addPanel(new Stats.Panel('MB', '#f8f', '#212'))
        this.stats.dom.style.cssText = 'position:absolute;top:0;left:0;'
        document.body.appendChild(this.stats.dom)
    }

    addLights(): void {
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2)
        this.directionalLight.target = this.mesh!
        this.directionalLight.position.set(5, 5, 5)
        this.directionalLight.castShadow = true
        this.directionalLight.shadow.mapSize.width = 1024
        this.directionalLight.shadow.mapSize.height = 1024

        this.scene.add(this.directionalLight)

        this.ambientLight = new THREE.AmbientLight(
            new THREE.Color(1, 1, 1),
            0.5
        )
        this.scene.add(this.ambientLight)
    }

    resize(): void {
        window.addEventListener('resize', this.onResize.bind(this))
    }

    onResize(): void {
        device.width = window.innerWidth
        device.height = window.innerHeight

        this.camera.aspect = device.width / device.height
        this.camera.updateProjectionMatrix()

        this.renderer.setSize(device.width, device.height)
    }

    addHelpers(): void {
        const geometrySettings = this.gui.addFolder('Geometry settings').close()
        const ambientLightSettings = this.gui
            .addFolder('Light settings')
            .close()

        const eventsSettings = this.gui.addFolder('Trigger events')

        geometrySettings
            .add(this.mesh!.position, 'y')
            .name('y position')
            .min(-2)
            .max(2)
            .step(0.01)

        settings.spin = () => {
            gsap.to(this.mesh!.rotation, {
                duration: 1,
                y: this.mesh!.rotation.y + Math.PI * 2,
            })
        }

        eventsSettings.add(settings, 'spin').name('spin')

        ambientLightSettings
            .addColor(settings, 'ambientLightColor')
            .name('ambient light color')
            .onChange(() => {
                this.ambientLight!.color.set(settings.ambientLightColor)
            })

        ambientLightSettings
            .add(this.ambientLight!, 'intensity')
            .name('ambient light intensity')
            .min(0)
            .max(10)
            .step(0.1)
    }
}
