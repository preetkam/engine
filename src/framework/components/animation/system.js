Object.assign(pc, function () {
    var _schema = [
        'enabled',
        'assets',
        'speed',
        'loop',
        'activate',
        'animations',
        'skeleton',
        'model',
        'prevAnim',
        'currAnim',
        'fromSkel',
        'toSkel',
        'blending',
        'blendTimeRemaining',
        'playing'
    ];

    /**
     * @class
     * @name pc.AnimationComponentSystem
     * @augments pc.ComponentSystem
     * @classdesc The AnimationComponentSystem manages creating and deleting AnimationComponents.
     * @description Create an AnimationComponentSystem.
     * @param {pc.Application} app - The application managing this system.
     */
    var AnimationComponentSystem = function AnimationComponentSystem(app) {
        pc.ComponentSystem.call(this, app);

        this.id = 'animation';
        this.description = "Specifies the animation assets that can run on the model specified by the Entity's model Component.";

        this.ComponentType = pc.AnimationComponent;
        this.DataType = pc.AnimationComponentData;

        this.schema = _schema;

        this.on('beforeremove', this.onBeforeRemove, this);
        this.on('update', this.onUpdate, this);

        pc.ComponentSystem.bind('update', this.onUpdate, this);
    };
    AnimationComponentSystem.prototype = Object.create(pc.ComponentSystem.prototype);
    AnimationComponentSystem.prototype.constructor = AnimationComponentSystem;

    pc.Component._buildAccessors(pc.AnimationComponent.prototype, _schema);

    Object.assign(AnimationComponentSystem.prototype, {
        initializeComponentData: function (component, data, properties) {
            properties = ['activate', 'enabled', 'loop', 'speed', 'assets'];
            pc.ComponentSystem.prototype.initializeComponentData.call(this, component, data, properties);
        },

        cloneComponent: function (entity, clone) {
            var key;
            this.addComponent(clone, {});

            clone.animation.assets = entity.animation.assets.slice();
            clone.animation.data.speed = entity.animation.speed;
            clone.animation.data.loop = entity.animation.loop;
            clone.animation.data.activate = entity.animation.activate;
            clone.animation.data.enabled = entity.animation.enabled;

            var clonedAnimations = { };
            var animations = entity.animation.animations;
            for (key in animations) {
                if (animations.hasOwnProperty(key)) {
                    clonedAnimations[key] = animations[key];
                }
            }
            clone.animation.animations = clonedAnimations;

            var clonedAnimationsIndex = { };
            var animationsIndex = entity.animation.animationsIndex;
            for (key in animationsIndex) {
                if (animationsIndex.hasOwnProperty(key)) {
                    clonedAnimationsIndex[key] = animationsIndex[key];
                }
            }
            clone.animation.animationsIndex = clonedAnimationsIndex;
        },

        onBeforeRemove: function (entity, component) {
            component.onBeforeRemove();
        },

        onUpdate: function (dt) {
            var components = this.store;

            for (var id in components) {
                if (components.hasOwnProperty(id)) {
                    var component = components[id];
                    var componentData = component.data;

                    if (componentData.enabled && component.entity.enabled) {

                        // update blending
                        if (componentData.blending) {
                            componentData.blend += dt * componentData.blendSpeed;
                            if (componentData.blend >= 1.0) {
                                componentData.blend = 1.0;
                            }
                        }

                        // update skeleton
                        if (componentData.playing) {
                            var skeleton = componentData.skeleton;
                            if (skeleton !== null && componentData.model !== null) {
                                if (componentData.blending) {
                                    skeleton.blend(componentData.fromSkel, componentData.toSkel, componentData.blend);
                                } else {
                                    // Advance the animation, interpolating keyframes at each animated node in
                                    // skeleton
                                    var delta = dt * componentData.speed;
                                    skeleton.addTime(delta);
                                    if (componentData.speed > 0 && (skeleton._time === skeleton._animation.duration) && !componentData.loop) {
                                        componentData.playing = false;
                                    } else if (componentData.speed < 0 && skeleton._time === 0 && !componentData.loop) {
                                        componentData.playing = false;
                                    }
                                }

                                if (componentData.blending && (componentData.blend === 1.0)) {
                                    skeleton.animation = componentData.toSkel._animation;
                                }

                                skeleton.updateGraph();
                            }
                        }

                        // update anim controller
                        var animController = componentData.animController;
                        if (animController) {

                            // force all clip's speed and playing state from the component
                            for (var i = 0; i < animController.clips.length; ++i) {
                                var clip = animController.clips[i];
                                clip.speed = componentData.speed;
                                if (!componentData.playing) {
                                    clip.pause();
                                } else {
                                    clip.resume();
                                }
                            }

                            // update blend weight
                            if (componentData.blending) {
                                animController.clips[1].blendWeight = componentData.blend;
                            }

                            animController.update(dt);
                        }

                        // clear blending flag
                        if (componentData.blending && componentData.blend === 1.0) {
                            componentData.blending = false;
                        }
                    }
                }
            }
        }
    });

    return {
        AnimationComponentSystem: AnimationComponentSystem
    };
}());
