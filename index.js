const k8s = require('@kubernetes/client-node');
const kc = new k8s.KubeConfig();

///Just for painting titles
function title(text) {
    var str = new Array(text.length + 1).join('*');
    console.log(`${str}\n${text}\n${str}`);
}

function errorMsg(error) {
    console.log(`Status code: ${error.statusCode}`);
    console.log(`Message: ${error.response.body.message}`);
}

async function main() {

    const NAMESPACE = 'default';
    const LABEL_SELECTOR = 'owner=0gis0';

    if (process.env.NODE_ENV === 'production') {
        //It uses the config from $HOME/.kube/config
        title('K8S');
        console.log(`Load from cluster`);
        kc.loadFromCluster();
    }
    else {
        // It uses the Service Account permissions (If you are using loadFromCluster (e.g. from inside a pod) then you need to set the serviceAccount on the pod)
        title('LOCAL');
        console.log(`Load from kube config`);
        kc.loadFromDefault();
    }

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    const batchV1Api = kc.makeApiClient(k8s.BatchV1Api);

    // Pod definition
    var pod = {
        metadata: {
            name: 'task',
            labels: {
                'owner': '0gis0'
            }
        },
        spec: {
            containers: [
                {
                    name: 'task',
                    image: 'busybox',
                    command: ['sleep', '10000']


                }
            ],
            restartPolicy: 'OnFailure'
        }
    };

    // Job definition
    var job = {
        metadata: {
            name: 'taskjob',
        },
        spec: {
            template: pod
        }
    };


    title('1. CREATE A JOB');
    try {
        let jobResult = await batchV1Api.createNamespacedJob(NAMESPACE, job);
        console.log(`Job '${jobResult.body.metadata.name}' created`);

    } catch (error) {
        title('ERROR CREATING JOB');
        errorMsg(error);
    }

    title(`2. LIST PODS with label ${LABEL_SELECTOR}`);
    let pods = null;
    try {
        pods = await k8sApi.listNamespacedPod(NAMESPACE, undefined, undefined, undefined, undefined, LABEL_SELECTOR);

        for (let index = 0; index < pods.body.items.length; index++) {
            let pod = pods.body.items[index];
            console.log(pod.metadata.name);
        }

    } catch (error) {
        title('ERROR LISTING PODS');
        errorMsg(error);
    }


    title('3. DELETE JOB');
    try {
        await batchV1Api.deleteNamespacedJob(job.metadata.name, NAMESPACE);
        console.log(`${job.metadata.name} deleted.`)
    } catch (error) {
        title('ERROR DELETING JOB');
        errorMsg(error);
    }


    title('4. DELETE PODS');
    for (let index = 0; index < pods.body.items.length; index++) {
        try {
            let pod = pods.body.items[index];
            await k8sApi.deleteNamespacedPod(pod.metadata.name, NAMESPACE);
            console.log(`${pod.metadata.name} deleted.`);
        } catch (error) {
            title('ERROR DELETING PODS');
            errorMsg(error);
        }
    }

    title('5. LIST SECRETS');
    try {
        let secrets = await k8sApi.listNamespacedSecret(NAMESPACE);
        for (let index = 0; index < secrets.body.items.length; index++) {
            let secret = secrets.body.items[index];
            console.log(secret.metadata.name);
        }
    } catch (error) {
        title('ERROR LISTING SECRETS');
        errorMsg(error);
    }
}

main();