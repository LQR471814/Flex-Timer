<script lang="ts">
	import { setContext } from 'svelte'

	let uploader
	let downloader

	let currentFileResolve

	setContext('FileActions', {
		upload: () => {
			uploader.click()
			return new Promise((resolve) => {
				currentFileResolve = resolve
			})
		},
		download: (blob: Blob, name: string) => {
			downloader.href = URL.createObjectURL(blob)
			downloader.download = name

			downloader.click()
		}
	})
</script>

<slot></slot>

<a
	style="display: none"
	href="This href is here to stop vscode from complaining"
	bind:this={downloader}
>
	This text is here to stop vscode from complaining
</a>

<input
	type="file"
	accept="application/JSON"
	style="display: none"
	on:change={() => {
		currentFileResolve(uploader.files[0])
		uploader.value = null //? Reset input
	}}
	bind:this={uploader}
>