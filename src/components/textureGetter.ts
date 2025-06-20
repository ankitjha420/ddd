import * as THREE from 'three'
import {
    MeshSurfaceSampler,
    type GPUComputationRenderer,
} from 'three/examples/jsm/Addons.js'

export const textureGetter = (
    shape: number,
    gpu: GPUComputationRenderer
): THREE.DataTexture => {
    let geometry: THREE.BufferGeometry
    if (shape === 1) {
        geometry = new THREE.IcosahedronGeometry(1, 2)
    } else if (shape === 2) {
        geometry = new THREE.DodecahedronGeometry(1, 0)
    } else if (shape === 3) {
        geometry = new THREE.CapsuleGeometry( 1, 1, 4, 8 )
    } else {
        geometry = new THREE.BoxGeometry(1, 1)
    }

    const mesh = new THREE.Mesh(geometry)

    const res = gpu.createTexture()
    fillPositionTextureTo(res, mesh)
    return res
}

const fillPositionTextureTo = (
    texture: THREE.DataTexture,
    mesh: THREE.Mesh
): void => {
    const arr = texture.image.data
    const sampler = new MeshSurfaceSampler(mesh).build()
    let pos = new THREE.Vector3()

    // @ts-ignore
    for (let k = 0, k1 = arr.length; k < k1; k += 16) {
        sampler.sample(pos)
        // @ts-ignore
        arr[k] = pos.x
        // @ts-ignore
        arr[k + 1] = pos.y
        // @ts-ignore
        arr[k + 2] = pos.z
        // @ts-ignore
        arr[k + 3] = 1
    }
}
