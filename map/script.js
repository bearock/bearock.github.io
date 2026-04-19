const { createApp, onMounted, ref } = Vue;

const app = createApp({
    setup() {
        const mapContainer = ref(null);
        let map = null;

        async function loadAndSetupIconLayer(mapInstance, url, iconName) {
            if (!mapInstance.getSource('countries')) {
                return;
            }

            try {
                const response = await fetch(url);

                // 若 HTTP 狀態不是 2xx，直接丟出錯誤進入 catch
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                let svgText = await response.text();
                const themeColor = '#d30000';
                svgText = svgText.replace(/fill="[^"]*"/g, `fill="${themeColor}" stroke="#000000" stroke-width="0.5"`);
                const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
                const objectUrl = URL.createObjectURL(blob);

                const img = new Image();
                img.onload = () => {
                    if (!mapInstance.hasImage(iconName)) {
                        mapInstance.addImage(iconName, img);
                    }

                    // SVG 成功
                    mapInstance.addLayer({
                        'id': 'country-points',
                        'type': 'symbol',
                        'source': 'countries',
                        'layout': {
                            'icon-image': iconName,
                            'icon-size': 0.3,
                            'icon-allow-overlap': true
                        }
                    });
                    URL.revokeObjectURL(objectUrl);
                };
                img.onerror = () => { throw new Error("SVG 解碼失敗"); };
                img.src = objectUrl;

            } catch (err) {
                // 備案
                console.warn("⚠️ SVG 改用圓點圖層", err.message);

                // 確保不要重複添加同 ID 的圖層
                if (!mapInstance.getLayer('country-points-fallback')) {
                    mapInstance.addLayer({
                        'id': 'country-points-fallback',
                        'type': 'circle',
                        'source': 'countries',
                        'paint': {
                            'circle-radius': 8,
                            'circle-color': '#d10000',
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#ffffff'
                        }
                    });
                }
            }
        }

        onMounted(() => {
            const isRoot = !window.location.pathname.includes('/map/');
            const jsonPath = isRoot ? 'map/countries.json' : 'countries.json';
            const svgPath = isRoot ? 'map/assets/volcano-icon.svg' : 'assets/volcano-icon.svg';

            // 初始化 MapLibre (ref/ID)
            const el = mapContainer.value || document.getElementById('map');
            if (!el) return;

            // 手機高度適應
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);

            // new Map
            map = new maplibregl.Map({
                container: el,
                style: 'https://tiles.openfreemap.org/styles/bright',
                center: [90, 25],
                zoom: 0,
                minZoom: 0,
                maxZoom: 0,

                renderWorldCopies: true,

                dragRotate: false,
                touchPitch: false,
                touchZoomRotate: false,
                keyboard: false,
                boxZoom: false,
                doubleClickZoom: false,
                scrollZoom: false
            });

            map.on('load', async () => {
                // 定義點位資料
                map.addSource('countries', {
                    'type': 'geojson',
                    'data': jsonPath
                });

                // 套曡點位
                await loadAndSetupIconLayer(map, svgPath, 'volcano-icon');
                const countryPointsLayers = ['country-points', 'country-points-fallback'];

                // Popup
                const popup = new maplibregl.Popup({
                    closeButton: false,
                    closeOnClick: false
                });

                // Make sure to detect marker change for overlapping markers
                // and use mousemove instead of mouseenter event
                let currentFeatureCoordinates = undefined;
                countryPointsLayers.forEach(layerId => {
                    map.on('mousemove', layerId, (e) => {
                        const featureCoordinates = e.features[0].geometry.coordinates.toString();
                        if (currentFeatureCoordinates !== featureCoordinates) {
                            currentFeatureCoordinates = featureCoordinates;

                            // Change the cursor style as a UI indicator.
                            map.getCanvas().style.cursor = 'pointer';

                            const coordinates = e.features[0].geometry.coordinates.slice();
                            const countryName = e.features[0].properties.name;
                            const description = e.features[0].properties.description;

                            // Ensure that if the map is zoomed out such that multiple
                            // copies of the feature are visible, the popup appears
                            // over the copy being pointed to.
                            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                            }

                            // Populate the popup and set its coordinates
                            // based on the feature found.
                            popup.setLngLat(coordinates)
                                .setHTML(`<strong>${countryName}:</strong> ${description}`)
                                .addTo(map);
                        }
                    });

                    map.on('mouseleave', layerId, () => {
                        currentFeatureCoordinates = undefined;
                        map.getCanvas().style.cursor = '';
                        popup.remove();
                    });

                    // 點擊跳轉新頁面
                    map.on('click', layerId, (e) => {
                        const feature = e.features[0];
                        const slug = feature.properties.slug;
                        if (slug) {
                            const pageLocation = `excursions/${slug}.html`;
                            const targetUrl = isRoot ? `map/${pageLocation}` : `${pageLocation}`;
                            window.open(targetUrl, '_blank');
                        }
                    });
                });
            });
        });

        return {
            mapContainer
        };
    }
});

const mountEl = document.getElementById('page-top') || document.getElementById('app');
if (mountEl) {
    app.mount(mountEl);
}
