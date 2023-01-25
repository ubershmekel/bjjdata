<script lang="ts">
	import Counter from './Counter.svelte';
	// import welcome from '$lib/images/svelte-welcome.webp';
	// import welcome_fallback from '$lib/images/svelte-welcome.png';
	// import dataJson from '$lib/../../../../dist/data.json';
	import dataJson from '@gitroot/dist/data.json';
	import type { MdData } from '@gitroot/tools/mds-to-jsons/types';

	const allTagsSet: Set<string> = new Set();
	for (const entry of dataJson.entries) {
		for (const clip of entry.clips) {
			clip.tags.forEach(allTagsSet.add, allTagsSet);
		}
	}
	const allTags = [...allTagsSet];
	allTags.sort();
	const filters: { [tag: string]: boolean } = {};
	for (const tag of allTags) {
		filters[tag] = false;
	}

	$: filteredEntries = function () {
		let filtersOnCount = 0;
		for (const key in filters) {
			if (filters[key]) {
				filtersOnCount += 1;
			}
		}
		if (filtersOnCount === 0) {
			// Too many youtube embeds at once
			// return dataJson.entries;
			return [];
		}
		const entries = [];
		for (const entry of dataJson.entries) {
			for (const clip of entry.clips) {
				let found = false;
				for (const tag of clip.tags) {
					if (filters[tag]) {
						found = true;
						break;
					}
				}
				if (found) {
					entries.push(entry);
				}
			}
		}
		return entries;
	};

	function youtubeParser(url: string) {
		var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
		var match = url.match(regExp);
		return match && match[7].length == 11 ? match[7] : false;
	}

	function minutesTextToSec(text: string) {
		const [mins, secs] = text.split(':');
		const totalSeconds = Number(mins) * 60 + Number(secs);
		return totalSeconds;
	}

	function youtubeIframeLink(entry: MdData) {
		console.log(entry);
		// https://www.youtube.com/embed/sz2W3QfXnHc?start=33&end=200
		const vidId = youtubeParser(entry.link);
		const startSec = minutesTextToSec(entry.clips[0].start);
		const endSec = minutesTextToSec(entry.clips[0].end);
		return `https://www.youtube.com/embed/${vidId}?start=${startSec}&end=${endSec}&autoplay=1&loop=1`;
	}
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<h1>BJJ Data</h1>

	<ul class="filters">
		{#each allTags as tag}<li>
				<label>
					<input type="checkbox" bind:checked={filters[tag]} />
					{tag}
				</label>
			</li>
		{/each}
	</ul>

	<hr />

	<div class="all-vid-cards">
		{#each filteredEntries() as entry}
			<div class="vid-card">
				{entry.title}<a href={entry.link}>🔗</a>
				<p>{entry.clips[0].tags.join(', ')}</p>
				<iframe
					title={entry.title}
					width="560"
					height="315"
					src={youtubeIframeLink(entry)}
					frameborder="0"
					allowfullscreen
				/>
			</div>
		{/each}
	</div>

	<p>
		<a href="https://github.com/ubershmekel/bjjdata">Github</a> data processing date: {dataJson.created}
	</p>
</section>

<style>
	section {
		/* display: flex;
		flex-direction: column;
		flex: 0.6; */
		justify-content: center;
		align-items: center;
	}

	h1 {
		width: 100%;
	}

	.filters {
		display: block;
	}

	.filters li {
		list-style-type: none;
		display: inline-block;
		box-sizing: border-box;
		line-height: 200%;
	}
	.filters li label {
		border: 1px solid #666;
		border-radius: 5px;
		white-space: nowrap;
		padding: 5px;
		margin: 5px;
		background-color: rgba(250, 250, 250, 0.5);
	}

	.vid-card {
		border-radius: 20px;
		margin: 5px;
		background-color: rgba(250, 250, 250, 0.5);
		padding: 25px;
		box-shadow: -6px 0px 5px #999;
	}
</style>
