import { ref } from 'vue'

const selectedFile = ref(null)

export function handleFileInputChange(event) {
    selectedFile.value = event.target.files[0]
}

export async function uploadFile() {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
}
