const { createApp, onMounted, ref } = Vue;

const app = createApp({
    setup() {
        const mapContainer = ref(null);
        let map = null;

        onMounted(() => {

            // 手機高度適應
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // 初始化 MapLibre
            map = new maplibregl.Map({
                container: mapContainer.value, 
                style: 'https://tiles.openfreemap.org/styles/bright',
                center: [121, 23],
                zoom: 0,
                minZoom: 0,
                maxZoom: 0,
                renderWorldCopies: false,
                dragRotate: false,
                touchZoomRotate: false,
            });

            map.on('load', () => {
                // 定義點位資料
                map.addSource('countries', {
                    'type': 'geojson',
                    'data': './countries.json' // 直接指向外部檔案
                });

                // 套曡點位
                map.addLayer({
                    'id': 'country-points',
                    'type': 'circle',
                    'source': 'countries',
                    'paint': {
                        'circle-radius': 12,
                        'circle-color': '#4A90E2',
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#fff'
                    }
                });

                // popup
                // map.on('click', 'country-points', (e) => {
                //     const feature = e.features[0];
                //     new maplibregl.Popup()
                //         .setLngLat(feature.geometry.coordinates)
                //         .setHTML(`<strong>${feature.properties.description}</strong>`)
                //         .addTo(map);
                // });

                // Create a popup, but don't add it to the map yet.
                const popup = new maplibregl.Popup({
                    closeButton: false,
                    closeOnClick: false
                });

                // Make sure to detect marker change for overlapping markers
                // and use mousemove instead of mouseenter event
                let currentFeatureCoordinates = undefined;
                map.on('mousemove', 'country-points', (e) => {
                    const featureCoordinates = e.features[0].geometry.coordinates.toString();
                    if (currentFeatureCoordinates !== featureCoordinates) {
                        currentFeatureCoordinates = featureCoordinates;

                        // Change the cursor style as a UI indicator.
                        map.getCanvas().style.cursor = 'pointer';

                        const coordinates = e.features[0].geometry.coordinates.slice();
                        const description = e.features[0].properties.description;

                        // Ensure that if the map is zoomed out such that multiple
                        // copies of the feature are visible, the popup appears
                        // over the copy being pointed to.
                        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                        }

                        // Populate the popup and set its coordinates
                        // based on the feature found.
                        popup.setLngLat(coordinates).setHTML(description).addTo(map);
                    }
                });

                map.on('mouseleave', 'country-points', () => {
                    currentFeatureCoordinates = undefined;
                    map.getCanvas().style.cursor = '';
                    popup.remove();
                });
            });
        });

        return {
            mapContainer
        };
    }
});

app.mount('#app');