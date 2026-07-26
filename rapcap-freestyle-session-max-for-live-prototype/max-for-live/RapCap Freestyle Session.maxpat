{
	"patcher": {
		"fileversion": 1,
		"appversion": {
			"major": 9,
			"minor": 1,
			"revision": 4,
			"architecture": "x64",
			"modernui": 1
		},
		"classnamespace": "box",
		"rect": [
			100,
			100,
			900,
			610
		],
		"openrect": [
			0,
			0,
			720,
			170
		],
		"bglocked": 0,
		"openinpresentation": 1,
		"default_fontsize": 10,
		"default_fontface": 0,
		"default_fontname": "Arial Bold",
		"gridonopen": 1,
		"gridsize": [
			8,
			8
		],
		"gridsnaponopen": 1,
		"objectsnaponopen": 1,
		"toolbarvisible": 1,
		"enablehscroll": 1,
		"enablevscroll": 1,
		"devicewidth": 720,
		"description": "Metadata-first freestyle session capture for RapCap",
		"digest": "Marks beat blocks and verses against the Ableton transport.",
		"tags": "RapCap freestyle session metadata",
		"boxes": [
			{
				"box": {
					"id": "title",
					"maxclass": "comment",
					"patching_rect": [
						25,
						22,
						250,
						20
					],
					"numinlets": 1,
					"numoutlets": 0,
					"text": "RAPCAP / FREESTYLE SESSION",
					"fontface": 1,
					"fontsize": 13,
					"textcolor": [
						0.85,
						1,
						0.25,
						1
					],
					"presentation": 1,
					"presentation_rect": [
						14,
						9,
						250,
						20
					]
				}
			},
			{
				"box": {
					"id": "subtitle",
					"maxclass": "comment",
					"patching_rect": [
						25,
						44,
						270,
						18
					],
					"numinlets": 1,
					"numoutlets": 0,
					"text": "metadata capture • audio passes through unchanged",
					"fontsize": 9,
					"textcolor": [
						0.65,
						0.65,
						0.61,
						1
					],
					"presentation": 1,
					"presentation_rect": [
						14,
						29,
						280,
						18
					]
				}
			},
			{
				"box": {
					"id": "scan-button",
					"maxclass": "textbutton",
					"patching_rect": [
						25,
						80,
						78,
						28
					],
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [
						"int",
						"",
						"int"
					],
					"mode": 0,
					"text": "SCAN SET",
					"texton": "SCAN SET",
					"presentation": 1,
					"presentation_rect": [
						14,
						54,
						78,
						28
					],
					"bgcolor": [
						0.85,
						1,
						0.25,
						1
					],
					"bgcoloron": [
						0.85,
						1,
						0.25,
						1
					],
					"textcolor": [
						0.08,
						0.08,
						0.07,
						1
					],
					"textcoloron": [
						0.08,
						0.08,
						0.07,
						1
					]
				}
			},
			{
				"box": {
					"id": "capture-button",
					"maxclass": "textbutton",
					"patching_rect": [
						110,
						80,
						92,
						28
					],
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [
						"int",
						"",
						"int"
					],
					"mode": 0,
					"text": "PASSIVE ON/OFF",
					"texton": "PASSIVE ON/OFF",
					"presentation": 1,
					"presentation_rect": [
						98,
						54,
						92,
						28
					],
					"bgcolor": [
						1,
						0.39,
						0.28,
						1
					],
					"bgcoloron": [
						1,
						0.39,
						0.28,
						1
					],
					"textcolor": [
						0.08,
						0.08,
						0.07,
						1
					],
					"textcoloron": [
						0.08,
						0.08,
						0.07,
						1
					]
				}
			},
			{
				"box": {
					"id": "verse-button",
					"maxclass": "textbutton",
					"patching_rect": [
						195,
						80,
						100,
						28
					],
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [
						"int",
						"",
						"int"
					],
					"mode": 0,
					"text": "VERSE IN/OUT",
					"texton": "VERSE IN/OUT",
					"presentation": 1,
					"presentation_rect": [
						182,
						54,
						104,
						28
					],
					"bgcolor": [
						0.28,
						0.84,
						0.81,
						1
					],
					"bgcoloron": [
						0.28,
						0.84,
						0.81,
						1
					],
					"textcolor": [
						0.08,
						0.08,
						0.07,
						1
					],
					"textcoloron": [
						0.08,
						0.08,
						0.07,
						1
					]
				}
			},
			{
				"box": {
					"id": "block-button",
					"maxclass": "textbutton",
					"patching_rect": [
						302,
						80,
						100,
						28
					],
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [
						"int",
						"",
						"int"
					],
					"mode": 0,
					"text": "BLOCK IN/OUT",
					"texton": "BLOCK IN/OUT",
					"presentation": 1,
					"presentation_rect": [
						292,
						54,
						104,
						28
					],
					"bgcolor": [
						0.65,
						0.55,
						1,
						1
					],
					"bgcoloron": [
						0.65,
						0.55,
						1,
						1
					],
					"textcolor": [
						0.08,
						0.08,
						0.07,
						1
					],
					"textcoloron": [
						0.08,
						0.08,
						0.07,
						1
					]
				}
			},
			{
				"box": {
					"id": "block-menu",
					"maxclass": "umenu",
					"patching_rect": [
						409,
						80,
						84,
						28
					],
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [
						"int",
						"",
						""
					],
					"items": [
						"beat",
						",",
						"ad",
						",",
						"transition",
						",",
						"silence",
						",",
						"unknown"
					],
					"presentation": 1,
					"presentation_rect": [
						402,
						54,
						84,
						28
					]
				}
			},
			{
				"box": {
					"id": "rating-label",
					"maxclass": "comment",
					"patching_rect": [
						500,
						72,
						52,
						16
					],
					"numinlets": 1,
					"numoutlets": 0,
					"text": "RATING",
					"fontsize": 8,
					"textcolor": [
						0.65,
						0.65,
						0.61,
						1
					],
					"presentation": 1,
					"presentation_rect": [
						494,
						48,
						52,
						16
					]
				}
			},
			{
				"box": {
					"id": "rating-number",
					"maxclass": "number",
					"patching_rect": [
						500,
						88,
						45,
						24
					],
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"",
						"bang"
					],
					"minimum": 0,
					"maximum": 5,
					"presentation": 1,
					"presentation_rect": [
						494,
						62,
						45,
						20
					]
				}
			},
			{
				"box": {
					"id": "export-button",
					"maxclass": "textbutton",
					"patching_rect": [
						553,
						80,
						94,
						28
					],
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [
						"int",
						"",
						"int"
					],
					"mode": 0,
					"text": "EXPORT JSON",
					"texton": "EXPORT JSON",
					"presentation": 1,
					"presentation_rect": [
						547,
						54,
						94,
						28
					],
					"bgcolor": [
						0.85,
						1,
						0.25,
						1
					],
					"bgcoloron": [
						0.85,
						1,
						0.25,
						1
					],
					"textcolor": [
						0.08,
						0.08,
						0.07,
						1
					],
					"textcoloron": [
						0.08,
						0.08,
						0.07,
						1
					]
				}
			},
			{
				"box": {
					"id": "clear-button",
					"maxclass": "textbutton",
					"patching_rect": [
						654,
						80,
						58,
						28
					],
					"numinlets": 1,
					"numoutlets": 3,
					"outlettype": [
						"int",
						"",
						"int"
					],
					"mode": 0,
					"text": "CLEAR",
					"texton": "CLEAR",
					"presentation": 1,
					"presentation_rect": [
						647,
						54,
						58,
						28
					],
					"bgcolor": [
						0.45,
						0.45,
						0.42,
						1
					],
					"bgcoloron": [
						0.45,
						0.45,
						0.42,
						1
					],
					"textcolor": [
						0.08,
						0.08,
						0.07,
						1
					],
					"textcoloron": [
						0.08,
						0.08,
						0.07,
						1
					]
				}
			},
			{
				"box": {
					"id": "id-label",
					"maxclass": "comment",
					"patching_rect": [
						25,
						122,
						38,
						18
					],
					"numinlets": 1,
					"numoutlets": 0,
					"text": "YT ID",
					"fontsize": 8,
					"textcolor": [
						1,
						0.39,
						0.28,
						1
					],
					"presentation": 1,
					"presentation_rect": [
						14,
						95,
						38,
						18
					]
				}
			},
			{
				"box": {
					"id": "id-edit",
					"maxclass": "textedit",
					"patching_rect": [
						62,
						120,
						118,
						22
					],
					"numinlets": 1,
					"numoutlets": 4,
					"outlettype": [
						"",
						"int",
						"",
						""
					],
					"text": "",
					"presentation": 1,
					"presentation_rect": [
						52,
						92,
						118,
						22
					]
				}
			},
			{
				"box": {
					"id": "url-label",
					"maxclass": "comment",
					"patching_rect": [
						190,
						122,
						45,
						18
					],
					"numinlets": 1,
					"numoutlets": 0,
					"text": "YT URL",
					"fontsize": 8,
					"textcolor": [
						1,
						0.39,
						0.28,
						1
					],
					"presentation": 1,
					"presentation_rect": [
						180,
						95,
						45,
						18
					]
				}
			},
			{
				"box": {
					"id": "url-edit",
					"maxclass": "textedit",
					"patching_rect": [
						235,
						120,
						286,
						22
					],
					"numinlets": 1,
					"numoutlets": 4,
					"outlettype": [
						"",
						"int",
						"",
						""
					],
					"text": "",
					"presentation": 1,
					"presentation_rect": [
						225,
						92,
						286,
						22
					]
				}
			},
			{
				"box": {
					"id": "status-label",
					"maxclass": "comment",
					"patching_rect": [
						25,
						153,
						44,
						18
					],
					"numinlets": 1,
					"numoutlets": 0,
					"text": "STATUS",
					"fontsize": 8,
					"textcolor": [
						0.65,
						0.65,
						0.61,
						1
					],
					"presentation": 1,
					"presentation_rect": [
						14,
						128,
						44,
						18
					]
				}
			},
			{
				"box": {
					"id": "status-message",
					"maxclass": "message",
					"patching_rect": [
						72,
						151,
						575,
						22
					],
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "ready — scan set, enter YouTube metadata, start capture",
					"presentation": 1,
					"presentation_rect": [
						58,
						124,
						647,
						24
					]
				}
			},
			{
				"box": {
					"id": "plugin",
					"maxclass": "newobj",
					"patching_rect": [
						25,
						490,
						55,
						22
					],
					"numinlets": 2,
					"numoutlets": 2,
					"outlettype": [
						"signal",
						"signal"
					],
					"text": "plugin~"
				}
			},
			{
				"box": {
					"id": "plugout",
					"maxclass": "newobj",
					"patching_rect": [
						25,
						548,
						58,
						22
					],
					"numinlets": 2,
					"numoutlets": 2,
					"outlettype": [
						"signal",
						"signal"
					],
					"text": "plugout~"
				}
			},
			{
				"box": {
					"id": "thisdevice",
					"maxclass": "newobj",
					"patching_rect": [
						780,
						25,
						92,
						22
					],
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "live.thisdevice"
				}
			},
			{
				"box": {
					"id": "loadbang",
					"maxclass": "newobj",
					"patching_rect": [
						780,
						60,
						58,
						22
					],
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						"bang"
					],
					"text": "loadbang"
				}
			},
			{
				"box": {
					"id": "deferlow",
					"maxclass": "newobj",
					"patching_rect": [
						780,
						95,
						56,
						22
					],
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "deferlow"
				}
			},
			{
				"box": {
					"id": "load-scan-message",
					"maxclass": "message",
					"patching_rect": [
						780,
						130,
						38,
						22
					],
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "scan"
				}
			},
			{
				"box": {
					"id": "bridge",
					"maxclass": "newobj",
					"patching_rect": [
						410,
						350,
						205,
						22
					],
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"",
						""
					],
					"text": "js rapcap_session_bridge.js"
				}
			},
			{
				"box": {
					"id": "dict-view",
					"maxclass": "dict.view",
					"patching_rect": [
						410,
						405,
						350,
						150
					],
					"numinlets": 1,
					"numoutlets": 0
				}
			},
			{
				"box": {
					"id": "status-prepend",
					"maxclass": "newobj",
					"patching_rect": [
						640,
						350,
						76,
						22
					],
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "prepend set"
				}
			},
			{
				"box": {
					"id": "scan-sel",
					"maxclass": "newobj",
					"patching_rect": [
						25,
						215,
						36,
						22
					],
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"bang",
						""
					],
					"text": "sel 1"
				}
			},
			{
				"box": {
					"id": "scan-message",
					"maxclass": "message",
					"patching_rect": [
						25,
						250,
						38,
						22
					],
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "scan"
				}
			},
			{
				"box": {
					"id": "capture-sel",
					"maxclass": "newobj",
					"patching_rect": [
						110,
						215,
						36,
						22
					],
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"bang",
						""
					],
					"text": "sel 1"
				}
			},
			{
				"box": {
					"id": "capture-message",
					"maxclass": "message",
					"patching_rect": [
						110,
						250,
						88,
						22
					],
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "passive_toggle"
				}
			},
			{
				"box": {
					"id": "verse-sel",
					"maxclass": "newobj",
					"patching_rect": [
						210,
						215,
						36,
						22
					],
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"bang",
						""
					],
					"text": "sel 1"
				}
			},
			{
				"box": {
					"id": "verse-message",
					"maxclass": "message",
					"patching_rect": [
						210,
						250,
						78,
						22
					],
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "verse_toggle"
				}
			},
			{
				"box": {
					"id": "block-sel",
					"maxclass": "newobj",
					"patching_rect": [
						310,
						215,
						36,
						22
					],
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"bang",
						""
					],
					"text": "sel 1"
				}
			},
			{
				"box": {
					"id": "block-message",
					"maxclass": "message",
					"patching_rect": [
						310,
						250,
						78,
						22
					],
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "block_toggle"
				}
			},
			{
				"box": {
					"id": "block-prepend",
					"maxclass": "newobj",
					"patching_rect": [
						405,
						215,
						112,
						22
					],
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "prepend block_type"
				}
			},
			{
				"box": {
					"id": "rating-prepend",
					"maxclass": "newobj",
					"patching_rect": [
						525,
						215,
						92,
						22
					],
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "prepend rating"
				}
			},
			{
				"box": {
					"id": "export-sel",
					"maxclass": "newobj",
					"patching_rect": [
						635,
						215,
						36,
						22
					],
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"bang",
						""
					],
					"text": "sel 1"
				}
			},
			{
				"box": {
					"id": "export-message",
					"maxclass": "message",
					"patching_rect": [
						635,
						250,
						90,
						22
					],
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "write_manifest"
				}
			},
			{
				"box": {
					"id": "clear-sel",
					"maxclass": "newobj",
					"patching_rect": [
						735,
						215,
						36,
						22
					],
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"bang",
						""
					],
					"text": "sel 1"
				}
			},
			{
				"box": {
					"id": "clear-message",
					"maxclass": "message",
					"patching_rect": [
						735,
						250,
						102,
						22
					],
					"numinlets": 2,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "clear_annotations"
				}
			},
			{
				"box": {
					"id": "id-route",
					"maxclass": "newobj",
					"patching_rect": [
						35,
						305,
						62,
						22
					],
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"",
						""
					],
					"text": "route text"
				}
			},
			{
				"box": {
					"id": "id-prepend",
					"maxclass": "newobj",
					"patching_rect": [
						105,
						305,
						108,
						22
					],
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "prepend youtube_id"
				}
			},
			{
				"box": {
					"id": "url-route",
					"maxclass": "newobj",
					"patching_rect": [
						230,
						305,
						62,
						22
					],
					"numinlets": 1,
					"numoutlets": 2,
					"outlettype": [
						"",
						""
					],
					"text": "route text"
				}
			},
			{
				"box": {
					"id": "url-prepend",
					"maxclass": "newobj",
					"patching_rect": [
						300,
						305,
						115,
						22
					],
					"numinlets": 1,
					"numoutlets": 1,
					"outlettype": [
						""
					],
					"text": "prepend youtube_url"
				}
			}
		],
		"lines": [
			{
				"patchline": {
					"source": [
						"plugin",
						0
					],
					"destination": [
						"plugout",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"plugin",
						1
					],
					"destination": [
						"plugout",
						1
					]
				}
			},
			{
				"patchline": {
					"source": [
						"thisdevice",
						0
					],
					"destination": [
						"deferlow",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"loadbang",
						0
					],
					"destination": [
						"deferlow",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"deferlow",
						0
					],
					"destination": [
						"load-scan-message",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"load-scan-message",
						0
					],
					"destination": [
						"bridge",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"bridge",
						0
					],
					"destination": [
						"dict-view",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"bridge",
						1
					],
					"destination": [
						"status-prepend",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"status-prepend",
						0
					],
					"destination": [
						"status-message",
						1
					]
				}
			},
			{
				"patchline": {
					"source": [
						"scan-button",
						0
					],
					"destination": [
						"scan-sel",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"scan-sel",
						0
					],
					"destination": [
						"scan-message",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"scan-message",
						0
					],
					"destination": [
						"bridge",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"capture-button",
						0
					],
					"destination": [
						"capture-sel",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"capture-sel",
						0
					],
					"destination": [
						"capture-message",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"capture-message",
						0
					],
					"destination": [
						"bridge",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"verse-button",
						0
					],
					"destination": [
						"verse-sel",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"verse-sel",
						0
					],
					"destination": [
						"verse-message",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"verse-message",
						0
					],
					"destination": [
						"bridge",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"block-button",
						0
					],
					"destination": [
						"block-sel",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"block-sel",
						0
					],
					"destination": [
						"block-message",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"block-message",
						0
					],
					"destination": [
						"bridge",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"block-menu",
						0
					],
					"destination": [
						"block-prepend",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"block-prepend",
						0
					],
					"destination": [
						"bridge",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"rating-number",
						0
					],
					"destination": [
						"rating-prepend",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"rating-prepend",
						0
					],
					"destination": [
						"bridge",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"export-button",
						0
					],
					"destination": [
						"export-sel",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"export-sel",
						0
					],
					"destination": [
						"export-message",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"export-message",
						0
					],
					"destination": [
						"bridge",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"clear-button",
						0
					],
					"destination": [
						"clear-sel",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"clear-sel",
						0
					],
					"destination": [
						"clear-message",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"clear-message",
						0
					],
					"destination": [
						"bridge",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"id-edit",
						0
					],
					"destination": [
						"id-route",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"id-route",
						0
					],
					"destination": [
						"id-prepend",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"id-prepend",
						0
					],
					"destination": [
						"bridge",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"url-edit",
						0
					],
					"destination": [
						"url-route",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"url-route",
						0
					],
					"destination": [
						"url-prepend",
						0
					]
				}
			},
			{
				"patchline": {
					"source": [
						"url-prepend",
						0
					],
					"destination": [
						"bridge",
						0
					]
				}
			}
		],
		"dependency_cache": [
			{
				"name": "rapcap_session_bridge.js",
				"bootpath": ".",
				"patcherrelativepath": ".",
				"type": "TEXT",
				"implicit": 1
			},
			{
				"name": "rapcap-storage-config.json",
				"bootpath": ".",
				"patcherrelativepath": ".",
				"type": "JSON",
				"implicit": 1
			}
		],
		"latency": 0,
		"project": {
			"version": 1,
			"creationdate": 3857568000,
			"modificationdate": 3857568000,
			"viewrect": [
				0,
				0,
				300,
				500
			],
			"autoorganize": 1,
			"hideprojectwindow": 1,
			"showdependencies": 1,
			"autolocalize": 0,
			"contents": {
				"patchers": {}
			},
			"layout": {},
			"searchpath": {},
			"detailsvisible": 0,
			"amxdtype": 1633771873,
			"readonly": 0,
			"devpathtype": 0,
			"devpath": ".",
			"sortmode": 0,
			"viewmode": 0
		},
		"autosave": 0
	}
}
