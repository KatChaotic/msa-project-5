kubectl run -it --rm pvc-viewer --image=busybox --restart=Never \
  --overrides='
{
  "spec": {
    "volumes": [
      {
        "name": "export-data",
        "persistentVolumeClaim": {
          "claimName": "export-data-pvc"
        }
      }
    ],
    "containers": [
      {
        "name": "pvc-viewer",
        "image": "busybox",
        "volumeMounts": [
          {
            "mountPath": "/opt/exports",
            "name": "export-data"
          }
        ],
        "command": ["ls", "-la", "/opt/exports"]
      }
    ]
  }
}'