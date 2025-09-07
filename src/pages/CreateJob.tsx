const handleSubmit = async (values: JobFormValues) => {
    if (!currentProfile) {
      toast.error("User profile not found. Cannot create job.");
      return;
    }

    try {
      const newJobData = {
        ref: values.override_ref ? values.manual_ref : undefined,
        status: 'planned' as const,
        pickup_eta: values.pickup_eta || null,
        delivery_eta: values.delivery_eta || null,
      };

      const newStopsData = [...values.collections, ...values.deliveries].map((stop, index) => ({
        ...stop,
        type: index < values.collections.length ? 'collection' : 'delivery',
        seq: index + 1,
      }));

      const promise = createJob(currentOrgId, newJobData, newStopsData, currentProfile.id);

      toast.promise(promise, {
        loading: 'Creating job...',
        success: (newJob) => {
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          navigate(`/jobs/${newJob.id}`);
          return `Job ${newJob.ref} created successfully!`;
        },
        error: 'Failed to create job.',
      });
    } catch (err) {
      console.error("Error creating job:", err);
      toast.error("An unexpected error occurred while creating the job.");
    }
  };