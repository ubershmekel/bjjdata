<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import dataJson from '@gitroot/dist/data.json';
	import type { MdData } from '@gitroot/tools/mds-to-jsons/types';
	import { goto, afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';

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

	const urlFilterSep = '+';

	function activeUrlFilters() {
		const filtersOn = [];
		const filterText = window.location.search.replace('?f=', '');
		const filterList = filterText.split(urlFilterSep);
		for (const tag of filterList) {
			if (tag.trim().length === 0) {
				// URL might have nothing in it, '' is not a filter tag
				continue;
			}
			filtersOn.push(tag.trim());
		}
		filtersOn.sort();
		return filtersOn;
	}

	let hasPageEntered = false;
	afterNavigate(({ type }) => {
		console.log('afterNavigate type', type);
		//  previousPage = from?.url.pathname || previousPage
		if (type === 'goto') {
			// avoid the infinite loop
			return;
		}
		if (type === 'enter') {
			hasPageEntered = true;
		}
		if (browser) {
			// Activate the checkbox per the URL params
			for (const tag of activeUrlFilters()) {
				filters[tag] = true;
			}
		}
	});

	function arrayEquals(a: any[], b: any[]) {
		return JSON.stringify(a) === JSON.stringify(b);
	}

	function onFiltersChanged() {
		console.log('onFiltersChanged');
		if (!hasPageEntered) {
			// Give the URL a chance to update when we first load the page
			return;
		}
		const filtersChecked = [];
		for (const key in filters) {
			if (filters[key]) {
				filtersChecked.push(key);
			}
		}
		filtersChecked.sort();
		const filtersString = filtersChecked.join(urlFilterSep);

		let url = '.';
		if (filtersString) {
			url = '?f=' + filtersString;
		}
		if (!arrayEquals(activeUrlFilters(), filtersChecked)) {
			console.log(
				`goto from ${window.location.search} to ${url}`,
				activeUrlFilters(),
				filtersChecked
			);
			// Without `replaceState: true` there were all kinds of bugs to do with
			// the back button triggering a `onFiltersChanged` which triggered a `goto`
			// which made navigation broken.
			// goto(url, { replaceState: true });
			// goto works in dev but on github pages it causes a refresh and throws an error:
			// Error: Not found: /bjjdata/
			// So let's keep this simple
			const title = 'BJJ Data';
			window.history.replaceState({}, title, url);
		}
	}

	$: if (filters) {
		// Update URL when the filters change
		if (browser) {
			onFiltersChanged();
		}
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
				let found = 0;
				for (const tag of clip.tags) {
					if (filters[tag]) {
						found += 1;
					}
				}
				if (found === filtersOnCount) {
					// Found all the selected filters in this clip
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
		//const endSec = minutesTextToSec(entry.clips[0].end);
		//&end=${endSec}
		return `https://www.youtube.com/embed/${vidId}?start=${startSec}&enablejsapi=1`;
	}

	const ytPlayers: { [key: string]: any } = {};
	const playerEntries: { [key: string]: MdData } = {};

	onMount(async () => {
		const tag = document.createElement('script');
		tag.src = 'https://www.youtube.com/iframe_api';
		const headTag = document.getElementsByTagName('head')[0];
		headTag.appendChild(tag);

		// const firstScriptTag = document.getElementsByTagName('script')[0];
		// (firstScriptTag.parentNode as Element).insertBefore(tag, firstScriptTag);
		(window as any).onYouTubeIframeAPIReady = function () {
			console.log('onYouTubeIframeAPIReady');
		};

		setInterval(loopVideos, 500);
	});

	function loopVideos() {
		for (const key in ytPlayers) {
			const player = ytPlayers[key];
			if (player.getPlayerState && player.getPlayerState() === 1) {
				// playing
				const timeSeconds = player.getCurrentTime();
				const clip = playerEntries[key].clips[0];
				const endSeconds = minutesTextToSec(clip.end);
				if (timeSeconds > endSeconds) {
					const startSeconds = minutesTextToSec(clip.start);
					player.seekTo(startSeconds);
				}
			}
		}
	}

	function loadYouTube() {
		if (!(window as any).YT) {
			setTimeout(loadYouTube, 500);
		}

		for (const entry of filteredEntries()) {
			const player = new (window as any).YT.Player(entry.id, {
				events: {
					onStateChange: onPlayerStateChange
				}
			});
			ytPlayers[entry.id] = player;
			playerEntries[entry.id] = entry;
		}
	}

	afterUpdate(async () => {
		loadYouTube();
	});

	function onPlayerStateChange(event: any) {
		console.log('onPlayerStateChange', event);
		//player.seekTo(seconds:Number, allowSeekAhead:Boolean):Void
		//player.getCurrentTime()
		// player.getPlayerState() (1 is playing)
	}

	function youtubeTimeLink(entry: MdData) {
		return entry.link + '&t=' + minutesTextToSec(entry.clips[0].start);
	}
</script>

<svelte:head>
	<title>BJJ Data</title>
	<meta
		name="description"
		content="An open source collection of timestamped YouTube clips of tournament BJJ submissions"
	/>
</svelte:head>

<section>
	<h1>BJJ Data</h1>

	<p>
		This website is an open source collection of {dataJson.entries.length} YouTube clips of submissions,
		performed by world champions during tournaments. The idea is to make it easier to analyze Brazilian
		jiu-jitsu details that have been proven to work. Click the filters below to narrow down the clips
		you'd like to see.
	</p>

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
				{entry.title}<a href={youtubeTimeLink(entry)}>🔗</a>
				<p>{entry.clips[0].tags.join(', ')}</p>
				<iframe
					id={entry.id}
					title={entry.title}
					width="100%"
					height="415"
					src={youtubeIframeLink(entry)}
					frameborder="0"
					allowfullscreen
				/>
			</div>
		{/each}
	</div>

	<p>
		Contribute clips on <a href="https://github.com/ubershmekel/bjjdata">Github</a>. Data processing
		date: {dataJson.created}. Fetch the
		<a href="https://ubershmekel.github.io/bjjdata/data.json">JSON data</a> to embed it on your site.
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
