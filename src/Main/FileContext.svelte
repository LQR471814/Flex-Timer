<script lang="ts">
	import { setContext } from 'svelte'

	export let limitTo = ""

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
	href="This href is here to stop vscode from complaining"
	bind:this={downloader}
>
	This text is here to stop vscode from complaining
</a>

<input
	type="file"
	accept={limitTo}
	on:change={() => {
		currentFileResolve(uploader.files[0])
		uploader.value = null //? Reset input
	}}
	bind:this={uploader}
>

<style>
	a, input {
		display: none;
	}
</style>