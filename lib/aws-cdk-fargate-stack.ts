import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';x
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { aws_ecs_patterns } from 'aws-cdk-lib'
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';

export class AwsCdkFargateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'AwsCdkFargateQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    const vpc = new ec2.Vpc(this, "FargateNodeJsVpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "ingress",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "application",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    const loadbalancer = new ApplicationLoadBalancer(this, "lb", {
      vpc,
      internetFacing: true,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PUBLIC,
      }),
    });

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      clusterName: "fargate-node-cluster",
    });

    const repo = new ecr.Repository(this, "Repo", {
      repositoryName: "fargate-nodejs-app",
    });
    
    const executionRole = new iam.Role(this, "ExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });

    new aws_ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "FargateNodeService",
      {
        cluster,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
          containerName: "nodejs-app-container",
          family: "fargate-node-task-defn",
          containerPort: 80,
          executionRole,
        },
        cpu: 256,
        memoryLimitMiB: 512,
        desiredCount: 2,
        serviceName: "fargate-node-service",
        taskSubnets: vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }),
        loadBalancer: loadbalancer,
      }
    );
  }
}


